# backend/app/routes/perks.py
import logging
from dataclasses import asdict

from flask import Blueprint, jsonify, request

from app.core import redis_cache
from app.core.cache_params import norm_bool, norm_choice, norm_int, norm_lower
from app.core.extensions import db
from app.core.http_cache import cache_catalog
from app.core.security import get_current_user
from app.services.perks.queries_perk import ALLOWED_SORT_FIELDS
from app.services.perks import (
    fetch_addons,
    fetch_character_detail,
    fetch_character_suggestions,
    fetch_characters,
    fetch_items,
    fetch_perk_by_identifier,
    fetch_perk_suggestions,
    fetch_perks,
)
from app.utils.lang import extract_lang as _extract_lang
from app.utils.pagination import paginate_args
from sqlalchemy import select, text

logger = logging.getLogger(__name__)
perks_bp = Blueprint("perks", __name__)

#: Paging bounds shared by the view and the cache key.
PERKS_DEFAULT_LIMIT = 50
PERKS_MAX_LIMIT = 1000  # the catalog asks for limit=1000; the table has ~320 rows
PERKS_MAX_PAGE = 10000
SUGGESTIONS_MAX_LIMIT = 50

#: Any other category selects nothing and is not cached.
_ROLE = norm_choice(("survivor", "killer"), strict=True)
_FILTER = norm_lower(drop_all=True)
_TEXT = norm_lower()


def _extract_optional_user_id() -> int | None:
    """Return the authenticated user's id from the JWT/session; ignores any query parameter."""
    user = get_current_user()
    if user:
        return user.id

    return None


@perks_bp.route("/api/v1/health", methods=["GET"])
def health_check():
    # Whether the catalog cache is one shared Redis or four per-worker
    # fallbacks is invisible from the outside until it starts serving stale
    # data, so the health probe says which it is.
    return jsonify({
        "status": "healthy",
        "service": "dbd-backend-api",
        "cache": redis_cache.stats(),
    }), 200


@perks_bp.route("/api/v1/readyz", methods=["GET"])
def readiness_check():
    """Readiness, not just liveness: 200 only when the database answers and the rate-limit Redis
    (when one is configured) does. The cache Redis is reported but optional -- without it each
    worker falls back to its own in-process cache, so the site still works."""
    checks: dict[str, str] = {}
    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = "up"
    except Exception as exc:
        logger.warning("Readiness: database check failed: %s", exc)
        db.session.rollback()
        checks["database"] = "down"
    checks.update(redis_cache.readiness())
    ready = checks["database"] == "up" and checks["limits"] != "down"
    response = jsonify({"status": "ready" if ready else "unavailable", "checks": checks})
    response.headers["Cache-Control"] = "no-store"
    return response, 200 if ready else 503


@perks_bp.route("/api/v1/perks", methods=["GET"])
@cache_catalog(
    ttl=3600,
    vary={
        "category": _ROLE,
        "character": _FILTER,
        "scope": norm_choice(("general", "teachable")),
        "search": _TEXT,
        "sort_by": norm_choice(ALLOWED_SORT_FIELDS, default="name"),
        "order": norm_choice(("desc",)),
        "page": norm_int(1, 1, PERKS_MAX_PAGE, clamp_high=False),
        "limit": norm_int(PERKS_DEFAULT_LIMIT, 1, PERKS_MAX_LIMIT),
        "owned_only": norm_bool(),
    },
)
def list_perks():
    """Retrieve perks with filtering, sorting, pagination, and ownership status."""
    category = request.args.get("category")
    character = request.args.get("character")
    scope = request.args.get("scope")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", default="name", type=str)
    order = request.args.get("order", default="asc", type=str)
    page, limit = paginate_args(
        default_per_page=PERKS_DEFAULT_LIMIT, max_per_page=PERKS_MAX_LIMIT, per_page_arg="limit"
    )
    lang = _extract_lang()

    owned_only_param = request.args.get("owned_only", "false").lower()
    owned_only = owned_only_param in ["true", "1", "yes"]

    user_id = _extract_optional_user_id()

    result = fetch_perks(
        category=category,
        character=character,
        scope=scope,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
        user_id=user_id,
        owned_only=owned_only,
        lang=lang,
    )
    return jsonify(result), 200


@perks_bp.route("/api/v1/perks/suggestions", methods=["GET"])
@cache_catalog(
    ttl=3600,
    vary={"q": _TEXT, "category": _ROLE, "limit": norm_int(10, 1, SUGGESTIONS_MAX_LIMIT)},
)
def get_perk_suggestions():
    q = request.args.get("q", default="", type=str)
    category = request.args.get("category")
    limit = max(1, min(request.args.get("limit", default=10, type=int), SUGGESTIONS_MAX_LIMIT))
    lang = _extract_lang()
    suggestions = fetch_perk_suggestions(query=q, category=category, limit=limit, lang=lang)
    return jsonify({"data": suggestions, "count": len(suggestions)}), 200


@perks_bp.route("/api/v1/characters/suggestions", methods=["GET"])
@cache_catalog(
    ttl=3600,
    vary={"q": _TEXT, "category": _ROLE, "limit": norm_int(15, 1, SUGGESTIONS_MAX_LIMIT)},
)
def get_character_suggestions():
    q = request.args.get("q", default="", type=str)
    category = request.args.get("category")
    limit = max(1, min(request.args.get("limit", default=15, type=int), SUGGESTIONS_MAX_LIMIT))
    suggestions = fetch_character_suggestions(query=q, category=category, limit=limit)
    return jsonify({"data": suggestions, "count": len(suggestions)}), 200


@perks_bp.route("/api/v1/perks/<string:identifier>", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def get_perk(identifier: str):
    lang = _extract_lang()
    perk = fetch_perk_by_identifier(identifier=identifier, lang=lang)
    if not perk:
        return jsonify({"error": "Perk not found", "status": 404}), 404
    return jsonify({"data": perk}), 200


@perks_bp.route("/api/v1/characters", methods=["GET"])
@cache_catalog(ttl=86400, vary={"category": _ROLE})
def list_characters():
    category = request.args.get("category")
    lang = _extract_lang()
    characters = fetch_characters(category=category, lang=lang)
    return jsonify({"count": len(characters), "data": characters}), 200


@perks_bp.route("/api/v1/chapters", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def list_chapters():
    """Retrieve all chapter/DLC banner images for client-side name matching."""
    from app.core.extensions import db
    from app.models import Chapter
    from sqlalchemy import select

    rows = db.session.scalars(select(Chapter)).all()
    return jsonify({"chapters": [r.to_dict() for r in rows]}), 200


@perks_bp.route("/api/v1/stats/summary", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def stats_summary():
    """Lightweight counts for the sidebar "vault stats" card.

    Every frontend page used to render those four numbers by fetching
    ``/api/v1/perks?limit=1000`` and counting categories in JavaScript -- the
    entire perk table, serialized and shipped to the browser on every single
    navigation, to display three integers. This does the same work as a few
    grouped COUNT(*) queries and returns a payload of about 100 bytes.
    """
    from sqlalchemy import func, select

    from app.core.extensions import db
    from app.models import Killer, Perk, Survivor

    perk_rows = db.session.execute(
        select(Perk.role, func.count(Perk.id)).group_by(Perk.role)
    ).all()
    # A GROUP BY over a role column becomes one COUNT per table, because the
    # table is the role.
    character_rows = [
        ("Survivor", db.session.scalar(select(func.count(Survivor.id))) or 0),
        ("Killer", db.session.scalar(select(func.count(Killer.id))) or 0),
    ]
    return jsonify({"perks": _role_counts(perk_rows), "characters": _role_counts(character_rows)}), 200


def _role_counts(rows) -> dict:
    """`{"total", "survivor", "killer"}` from `(role, count)` rows; a missing role counts 0."""
    by_role: dict[str, int] = {}
    for key, count in rows:
        role = (key or "").lower()
        by_role[role] = by_role.get(role, 0) + int(count)
    return {
        "total": sum(by_role.values()),
        "survivor": by_role.get("survivor", 0),
        "killer": by_role.get("killer", 0),
    }


@perks_bp.route("/api/v1/characters/<string:character_name>/detail", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def get_character_detail(character_name: str):
    lang = _extract_lang()
    detail = fetch_character_detail(character_name=character_name, lang=lang)
    if not detail:
        return jsonify({"error": "Character not found", "status": 404}), 404
    return jsonify({"data": detail}), 200


@perks_bp.route("/api/v1/challenge-modes", methods=["GET"])
@cache_catalog(ttl=300, vary=())
def list_challenge_modes_public():
    from app.services.admin_control_service import get_challenge_mode_settings
    return jsonify({"modes": get_challenge_mode_settings()}), 200


@perks_bp.route("/api/v1/survivors", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def list_survivors():
    lang = _extract_lang()
    survivors = fetch_characters(category="Survivor", lang=lang)
    return jsonify({"count": len(survivors), "data": survivors}), 200


@perks_bp.route("/api/v1/killers", methods=["GET"])
@cache_catalog(ttl=86400, vary=())
def list_killers():
    lang = _extract_lang()
    killers = fetch_characters(category="Killer", lang=lang)
    return jsonify({"count": len(killers), "data": killers}), 200


@perks_bp.route("/api/v1/items", methods=["GET"])
@cache_catalog(ttl=3600, vary={"category": _FILTER, "search": _TEXT})
def list_items():
    category = request.args.get("category")
    search = request.args.get("search")
    lang = _extract_lang()
    items = fetch_items(category=category, search=search, lang=lang)
    return jsonify({"count": len(items), "data": items}), 200


@perks_bp.route("/api/v1/addons", methods=["GET"])
@cache_catalog(
    ttl=3600,
    vary={"category": _FILTER, "target": _FILTER, "associated_target": _FILTER, "search": _TEXT},
)
def list_addons():
    category = request.args.get("category")
    target = request.args.get("target") or request.args.get("associated_target")
    search = request.args.get("search")
    lang = _extract_lang()
    addons = fetch_addons(category=category, target=target, search=search, lang=lang)
    return jsonify({"count": len(addons), "data": addons}), 200
