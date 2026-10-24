# backend/app/routes/scoreboard.py
"""Scoreboard screenshot check: what does the screenshot prove for the logged-in user?

The uploaded image only ever exists as a bytes object for the length of this
request. It is never written to disk, never put in the database, never logged;
only the derived report (names, statuses, loadouts, hash fingerprints) is returned.

Nothing has to be typed in: the player name is the logged-in user's alias (their
username), or their login when no alias is set; the role, character, status and
loadout are read from the screenshot.
"""
import logging
import threading
import time

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from app.core.extensions import db
from app.core.limiter import limiter
from app.core.rate_limits import per_minute
from app.core.security import login_required
from app.models import Item, ItemAddon, Killer, KillerAddon, Offering, Perk, Survivor
from app.services import scoreboard_ocr, site_settings
from app.services.db.asset_bundling import get_static_dir
from app.services.scoreboard_ocr import IconCatalog, IconRef, ScoreboardError

logger = logging.getLogger(__name__)
scoreboard_bp = Blueprint("scoreboard_bp", __name__, url_prefix="/api/v1/scoreboard")

_CATALOG_TTL_SECONDS = 600
_catalog_lock = threading.Lock()
_catalog_cache: tuple[float, IconCatalog] | None = None


def _no_store(payload: dict, status: int):
    response = jsonify(payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _character_names() -> list[str]:
    names = db.session.scalars(select(Survivor.name)).all()
    names += db.session.scalars(select(Killer.name)).all()
    return [n for n in names if n]


def _role(value: str | None) -> str:
    value = (value or "").strip().casefold()
    return value if value in ("survivor", "killer") else ""


def _build_catalog() -> list[IconRef]:
    """Reference icons for the loadout, from the files the catalogue already serves."""
    static = get_static_dir().resolve()
    refs: list[IconRef] = []

    def add(kind: str, name: str, local_path: str | None, role: str = "", group: str = "", rarity: str | None = "") -> None:
        if not name or not local_path:
            return
        path = (static / local_path.lstrip("/")).resolve()
        if static not in path.parents or not path.is_file():
            return
        refs.append(IconRef(kind, name, str(path), role, group, rarity or ""))

    for perk in db.session.scalars(select(Perk)).all():
        add("perk", perk.name, perk.icon_local_path, _role(perk.role))
    for item in db.session.scalars(select(Item)).unique().all():
        add("item", item.name, item.icon_local_path, "survivor", item.category.name if item.category else "", item.rarity)
    for addon in db.session.scalars(select(ItemAddon)).unique().all():
        add("addon", addon.name, addon.icon_local_path, "survivor", addon.item_category.name if addon.item_category else "", addon.rarity)
    for addon in db.session.scalars(select(KillerAddon)).unique().all():
        add("addon", addon.name, addon.icon_local_path, "killer", addon.killer.name if addon.killer else "", addon.rarity)
    for offering in db.session.scalars(select(Offering)).all():
        add("offering", offering.name, offering.icon_local_path, _role(offering.role), "", offering.rarity)
    return refs


def _icon_catalog() -> IconCatalog:
    """The reference icons, re-read from the database every 10 minutes. Each check only
    loads the groups it needs (survivor perks, the identified killer's add-ons, ...)."""
    global _catalog_cache
    now = time.monotonic()
    with _catalog_lock:
        if _catalog_cache is None or _catalog_cache[0] < now:
            try:
                _catalog_cache = (now + _CATALOG_TTL_SECONDS, IconCatalog(_build_catalog()))
            except Exception:  # noqa: BLE001 - without icons the loadout is just not read
                logger.exception("Could not build the scoreboard icon catalog")
                _catalog_cache = (now + 60, IconCatalog([]))
        return _catalog_cache[1]


def _expected_player() -> str | None:
    """The logged-in user's alias, or their login when no alias is set."""
    user = getattr(g, "current_user", None)
    if user is None:
        return None
    return (getattr(user, "username", None) or "").strip() or (getattr(user, "login", None) or "").strip() or None


@scoreboard_bp.route("/status", methods=["GET"])
def status():
    """Public: whether the OCR engine is installed on this server."""
    available = scoreboard_ocr.engine_available() and site_settings.scoreboard_ocr_enabled()
    return _no_store({"available": available, "max_bytes": site_settings.scoreboard_upload_max_bytes(), "note": scoreboard_ocr.ACCEPTED_INPUT_NOTE}, 200)


@scoreboard_bp.route("/analyze", methods=["POST"])
@login_required
@limiter.limit(per_minute("rate_scoreboard_per_minute"))
def analyze():
    if not scoreboard_ocr.engine_available() or not site_settings.scoreboard_ocr_enabled():
        return _no_store({"error": "Screenshot check is not available on this server.", "code": "engine_unavailable", "status": 503}, 503)

    max_bytes = site_settings.scoreboard_upload_max_bytes()
    if request.content_length and request.content_length > max_bytes + 64 * 1024:
        return _no_store({"error": "Image is too large.", "code": "too_large", "status": 413}, 413)

    upload = request.files.get("image")
    if upload is None:
        return _no_store({"error": "Send the screenshot as the 'image' form field.", "code": "missing_image", "status": 400}, 400)

    data = upload.stream.read(max_bytes + 1)
    if len(data) > max_bytes:
        return _no_store({"error": "Image is too large.", "code": "too_large", "status": 413}, 413)

    try:
        report = scoreboard_ocr.analyze_scoreboard(
            data,
            known_characters=_character_names(),
            expected_player=_expected_player(),
            icon_catalog=_icon_catalog(),
        )
    except ScoreboardError as err:
        return _no_store({"error": str(err), "code": err.code, "status": 400}, 400)
    except Exception:  # noqa: BLE001 - never leak internals or image content
        logger.exception("Scoreboard analysis failed")
        return _no_store({"error": "Could not analyze the screenshot.", "code": "analysis_failed", "status": 500}, 500)
    finally:
        del data, upload

    return _no_store({"status": 200, **report}, 200)
