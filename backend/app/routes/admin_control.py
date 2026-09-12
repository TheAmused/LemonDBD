# backend/app/routes/admin_control.py
from typing import Any
from flask import Blueprint, g, jsonify, request
from sqlalchemy import and_, case, select

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.core.security import admin_required
from app.models import Killer, Perk, Survivor
from app.models.admin import CHALLENGE_MODES
from app.services.admin_control_service import (
    get_audit_logs,
    get_challenge_mode_settings,
    log_admin_action,
    set_challenge_mode_enabled,
)

admin_control_bp = Blueprint("admin_control", __name__, url_prefix="/api/v1/admin")

MAX_REASON_LENGTH = 255


def _clean_reason(data: dict[str, Any]) -> str | None:
    """Trims and length-validates the admin-supplied disable reason before
    it hits a String(255) column. Raises ValueError on overflow instead of
    letting a DB-level DataError 500 the request."""
    reason = (data.get("reason") or "").strip() or None
    if reason and len(reason) > MAX_REASON_LENGTH:
        raise ValueError(f"Reason must be {MAX_REASON_LENGTH} characters or fewer.")
    return reason


@admin_control_bp.route("/characters", methods=["GET"])
@admin_required
def list_characters_for_admin():
    """Lists every character with its disable state, for the admin kill-switch UI."""
    role = request.args.get("role", "").strip()
    search = request.args.get("search", "").strip().lower()

    # One query per table. `release_number` was a column to sort on; it is the
    # primary key now -- the source numbered survivors and killers separately,
    # and that is exactly what each table's id is -- so ordering by id is the
    # same order with one fewer column to keep in step.
    wanted = (Survivor, Killer)
    if role and role.lower() != "all":
        wanted = (Killer,) if role.strip().lower().startswith("killer") else (Survivor,)

    characters = [
        row
        for model in wanted
        for row in db.session.scalars(select(model).order_by(model.id.asc())).all()
    ]
    if search:
        characters = [c for c in characters if search in c.name.lower()]

    return jsonify({
        "count": len(characters),
        "data": [
            {
                "id": c.id,
                "name": c.name,
                "role": c.role,
                "avatar_local_path": c.avatar_local_path,
                "is_disabled": c.is_disabled,
                "disabled_reason": c.disabled_reason,
            }
            for c in characters
        ],
    }), 200


@admin_control_bp.route("/characters/<int:character_id>/disable", methods=["PUT"])
@admin_required
def set_character_disabled(character_id: int):
    """Enables/disables a killer or survivor from being rolled into new challenge pools.

    `role` is required alongside the id: survivor 7 and killer 7 are different
    characters, so disabling "character 7" no longer names one row. It is read
    from the query string or the body, whichever the caller uses.
    """
    data = request.get_json(silent=True) or {}
    role = (request.args.get("role") or data.get("role") or "").strip().rstrip("s").lower()
    model = {"survivor": Survivor, "killer": Killer}.get(role)
    if model is None:
        return jsonify({
            "error": "Query or body field 'role' must be 'survivor' or 'killer'.",
        }), 400

    character = db.session.get(model, character_id)
    if not character:
        return jsonify({"error": "Character not found."}), 404

    is_disabled = data.get("is_disabled")
    if not isinstance(is_disabled, bool):
        return jsonify({"error": "Field 'is_disabled' (bool) is required."}), 400
    try:
        reason = _clean_reason(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    character.is_disabled = is_disabled
    character.disabled_reason = reason if is_disabled else None
    db.session.commit()

    # `is_disabled`/`disabled_reason` are serialized into the cached character
    # and perk catalog responses, so a kill switch that does not invalidate
    # them keeps the disabled character on the site for a day.
    bump_catalog_version()

    log_admin_action(
        g.current_user.id,
        action="character_disabled" if is_disabled else "character_enabled",
        target_type="character",
        target_id=character.id,
        details={"name": character.name, "reason": reason},
    )

    return jsonify({
        "message": f"{character.name} is now {'disabled' if is_disabled else 'enabled'}.",
        "character": {
            "id": character.id,
            "name": character.name,
            "is_disabled": character.is_disabled,
            "disabled_reason": character.disabled_reason,
        },
    }), 200


@admin_control_bp.route("/perks", methods=["GET"])
@admin_required
def list_perks_for_admin():
    """Lists perks with their disable state, for the admin kill-switch UI."""
    category = request.args.get("category", "All").strip()
    search = request.args.get("search", "").strip().lower()

    stmt = select(Perk)
    if category and category.lower() != "all":
        # `category` became `role`; the query-string name is unchanged.
        stmt = stmt.where(Perk.role == category)
    stmt = stmt.order_by(Perk.name.asc())

    perks = db.session.scalars(stmt).all()
    if search:
        perks = [
            p for p in perks
            if search in p.name.lower() or (p.character and search in p.character.name.lower())
        ]

    return jsonify({
        "count": len(perks),
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "character": p.character.name if p.character else "General",
                "icon_local_path": p.icon_local_path,
                "is_disabled": p.is_disabled,
                "disabled_reason": p.disabled_reason,
            }
            for p in perks
        ],
    }), 200


@admin_control_bp.route("/perks/<int:perk_id>/disable", methods=["PUT"])
@admin_required
def set_perk_disabled(perk_id: int):
    """Enables/disables a single perk from being offered in new challenge pools/pages."""
    perk = db.session.get(Perk, perk_id)
    if not perk:
        return jsonify({"error": "Perk not found."}), 404

    # This line was missing: `data` was read below without ever being assigned,
    # so every call to this endpoint raised NameError and returned a 500. The
    # sibling `set_character_disabled` has always had it.
    data = request.get_json(silent=True) or {}

    is_disabled = data.get("is_disabled")
    if not isinstance(is_disabled, bool):
        return jsonify({"error": "Field 'is_disabled' (bool) is required."}), 400
    try:
        reason = _clean_reason(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    perk.is_disabled = is_disabled
    perk.disabled_reason = reason if is_disabled else None
    db.session.commit()

    bump_catalog_version()

    log_admin_action(
        g.current_user.id,
        action="perk_disabled" if is_disabled else "perk_enabled",
        target_type="perk",
        target_id=perk.id,
        details={"name": perk.name, "reason": reason},
    )

    return jsonify({
        "message": f"{perk.name} is now {'disabled' if is_disabled else 'enabled'}.",
        "perk": {
            "id": perk.id,
            "name": perk.name,
            "is_disabled": perk.is_disabled,
            "disabled_reason": perk.disabled_reason,
        },
    }), 200


@admin_control_bp.route("/challenge-modes", methods=["GET"])
@admin_required
def list_challenge_modes():
    return jsonify({"modes": get_challenge_mode_settings()}), 200


@admin_control_bp.route("/challenge-modes/<string:mode>", methods=["PUT"])
@admin_required
def update_challenge_mode(mode: str):
    if mode not in CHALLENGE_MODES:
        return jsonify({"error": f"Unknown challenge mode '{mode}'."}), 400

    data = request.get_json(silent=True) or {}
    is_enabled = data.get("is_enabled")
    if not isinstance(is_enabled, bool):
        return jsonify({"error": "Field 'is_enabled' (bool) is required."}), 400
    try:
        reason = _clean_reason(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    updated = set_challenge_mode_enabled(mode, is_enabled, reason)

    # The same settings are served publicly by `/api/v1/challenge-modes`,
    # which is cached.
    bump_catalog_version()

    log_admin_action(
        g.current_user.id,
        action="challenge_mode_enabled" if is_enabled else "challenge_mode_disabled",
        target_type="challenge_mode",
        target_id=mode,
        details={"reason": reason},
    )

    return jsonify({
        "message": f"{mode} is now {'enabled' if is_enabled else 'disabled'}.",
        "setting": updated,
    }), 200


@admin_control_bp.route("/audit-logs", methods=["GET"])
@admin_required
def list_audit_logs():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 25, type=int)
    return jsonify(get_audit_logs(page=page, per_page=per_page)), 200
