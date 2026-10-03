# backend/app/routes/scoreboard.py
"""Scoreboard screenshot check: did the player actually win the match?

The uploaded image only ever exists as a bytes object for the length of this
request. It is never written to disk, never put in the database, never logged;
only the derived report (names, statuses, a hash fingerprint) is returned.
"""
import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from app.core.extensions import db
from app.core.limiter import limiter
from app.core.security import login_required
from app.models import Killer, Survivor
from app.services import scoreboard_ocr
from app.services.scoreboard_ocr import ScoreboardError

logger = logging.getLogger(__name__)
scoreboard_bp = Blueprint("scoreboard_bp", __name__, url_prefix="/api/v1/scoreboard")

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
_ROLES = {"survivor": "Survivor", "killer": "Killer"}


def _no_store(payload: dict, status: int):
    response = jsonify(payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _character_names() -> list[str]:
    names = db.session.scalars(select(Survivor.name)).all()
    names += db.session.scalars(select(Killer.name)).all()
    return [n for n in names if n]


@scoreboard_bp.route("/status", methods=["GET"])
def status():
    """Public: whether the OCR engine is installed on this server."""
    return _no_store({"available": scoreboard_ocr.engine_available(), "max_bytes": MAX_UPLOAD_BYTES, "note": scoreboard_ocr.ACCEPTED_INPUT_NOTE}, 200)


@scoreboard_bp.route("/analyze", methods=["POST"])
@login_required
@limiter.limit("6 per minute")
def analyze():
    if not scoreboard_ocr.engine_available():
        return _no_store({"error": "Screenshot check is not available on this server.", "code": "engine_unavailable", "status": 503}, 503)

    if request.content_length and request.content_length > MAX_UPLOAD_BYTES + 64 * 1024:
        return _no_store({"error": "Image is too large.", "code": "too_large", "status": 413}, 413)

    upload = request.files.get("image")
    if upload is None:
        return _no_store({"error": "Send the screenshot as the 'image' form field.", "code": "missing_image", "status": 400}, 400)

    data = upload.stream.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        return _no_store({"error": "Image is too large.", "code": "too_large", "status": 413}, 413)

    role = _ROLES.get((request.form.get("expected_role") or "").strip().lower())
    try:
        kills_for_win = int(request.form.get("kills_for_win") or 3)
    except ValueError:
        kills_for_win = 3
    kills_for_win = min(max(kills_for_win, 1), 4)

    try:
        report = scoreboard_ocr.analyze_scoreboard(
            data,
            known_characters=_character_names(),
            expected_player=(request.form.get("expected_player") or "").strip() or None,
            expected_role=role,
            expected_character=(request.form.get("expected_character") or "").strip() or None,
            kills_for_win=kills_for_win,
        )
    except ScoreboardError as err:
        return _no_store({"error": str(err), "code": err.code, "status": 400}, 400)
    except Exception:  # noqa: BLE001 - never leak internals or image content
        logger.exception("Scoreboard analysis failed")
        return _no_store({"error": "Could not analyze the screenshot.", "code": "analysis_failed", "status": 500}, 500)
    finally:
        del data, upload

    return _no_store({"status": 200, **report}, 200)
