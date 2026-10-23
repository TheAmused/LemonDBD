import logging
from typing import Any
from flask import Blueprint, g, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.extensions import db
from app.core.redis_cache import bump_catalog_version
from app.core.security import admin_required
from app.utils.pagination import paginate_args
from app.models import Killer, Perk, Survivor
from app.models.admin import CHALLENGE_MODES
from app.models.user import User
from app.services import site_settings
from app.services.admin_control_service import (
    get_audit_logs,
    get_challenge_mode_settings,
    log_admin_action,
    set_challenge_mode_enabled,
    set_character_disabled as svc_set_character_disabled,
    set_perk_disabled as svc_set_perk_disabled,
)
from app.services.content_moderation_service import (
    get_admin_reports,
    get_report_preview,
    resolve_report,
)
from app.services.moderation_actions import (
    ModerationError,
    apply_sanction,
    list_user_sanctions,
    moderation_summary,
    preview_sanction,
    restore_account,
    revoke_sanction,
)
from app.services.user.admin import fetch_admin_metrics
from pydantic import ValidationError
from app.schemas.admin import (
    DisableItemDTO,
    UpdateChallengeModeDTO,
    UpdateSiteSettingsDTO,
)
from app.utils.responses import api_error

logger = logging.getLogger(__name__)

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
    try:
        dto = DisableItemDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'is_disabled' (bool) is required.", 400, details=err.errors())

    try:
        reason = _clean_reason({"reason": dto.reason})
    except ValueError as e:
        return api_error(str(e), 400)

    role = (request.args.get("role") or dto.role or "").strip().rstrip("s").lower()
    character, err = svc_set_character_disabled(character_id, dto.is_disabled, reason, role)
    if err:
        return api_error(err, 404)

    log_admin_action(
        g.current_user.id,
        action="character_disabled" if dto.is_disabled else "character_enabled",
        target_type="character",
        # `survivor:7` / `killer:7`: the id alone names two different characters.
        target_id=f"{character.role.lower()}:{character.id}",
        details={"name": character.name, "reason": reason},
    )

    return jsonify({
        "message": f"{character.name} is now {'disabled' if dto.is_disabled else 'enabled'}.",
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

    # The owner is read for every row (name and search): load it with the perks, not one query each.
    stmt = select(Perk).options(joinedload(Perk.survivor), joinedload(Perk.killer))
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
                "category": p.role,
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
    try:
        dto = DisableItemDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'is_disabled' (bool) is required.", 400, details=err.errors())

    try:
        reason = _clean_reason({"reason": dto.reason})
    except ValueError as e:
        return api_error(str(e), 400)

    perk, err = svc_set_perk_disabled(perk_id, dto.is_disabled, reason)
    if err:
        return api_error(err, 404)

    log_admin_action(
        g.current_user.id,
        action="perk_disabled" if dto.is_disabled else "perk_enabled",
        target_type="perk",
        target_id=perk.id,
        details={"name": perk.name, "reason": reason},
    )

    return jsonify({
        "message": f"{perk.name} is now {'disabled' if dto.is_disabled else 'enabled'}.",
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
        return api_error(f"Unknown challenge mode '{mode}'.", 400)

    try:
        dto = UpdateChallengeModeDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'is_enabled' (bool) is required.", 400, details=err.errors())

    is_enabled = dto.is_enabled
    try:
        reason = _clean_reason({"reason": dto.reason})
    except ValueError as e:
        return api_error(str(e), 400)

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
    """`?target_type=user,bug_report` keeps only actions about those kinds of target."""
    page, per_page = paginate_args(default_per_page=25)
    raw = request.args.get("target_type", "")
    target_types = [part.strip() for part in raw.split(",") if part.strip()][:20]
    return jsonify(get_audit_logs(page=page, per_page=per_page, target_types=target_types or None)), 200


@admin_control_bp.route("/settings", methods=["GET"])
@admin_required
def list_site_settings():
    return jsonify({"settings": site_settings.list_settings()}), 200


@admin_control_bp.route("/settings", methods=["PUT"])
@admin_required
def update_site_settings():
    """Body: ``{"settings": {key: value | null}}``; ``null`` restores the config default."""
    try:
        dto = UpdateSiteSettingsDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'settings' (object) is required.", 400, details=err.errors())

    changes = dto.settings
    try:
        applied = site_settings.update_settings(changes, confirm_risky=dto.confirm_risky, reason=dto.reason)
    except site_settings.RiskyChangeError as err:
        return jsonify({"error": str(err), "error_code": "confirmation_required", "status": 400}), 400
    except ValueError as err:
        return api_error(str(err), 400)

    details: dict[str, Any] = {"changes": {k: ("<default>" if changes[k] is None else applied[k]) for k in applied}}
    if dto.reason.strip():
        details["reason"] = dto.reason.strip()
    log_admin_action(g.current_user.id, action="site_settings_updated", target_type="site_settings", details=details)
    return jsonify({"message": "Settings saved.", "settings": site_settings.list_settings()}), 200


@admin_control_bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    """Retrieve system-wide entity and registration metrics."""
    stats = fetch_admin_metrics()
    return jsonify(stats), 200


@admin_control_bp.route("/content-reports", methods=["GET"])
@admin_required
def list_content_reports():
    """List content reports with pagination and status filter."""
    status = request.args.get("status", "pending")
    page, per_page = paginate_args(default_per_page=20)
    try:
        result = get_admin_reports(status=status, page=page, per_page=per_page)
    except ValueError as err:
        return api_error(str(err), 400)
    return jsonify(result), 200


@admin_control_bp.route("/content-reports/<int:report_id>/preview", methods=["GET"])
@admin_required
def preview_content_report(report_id: int):
    """Retrieve full preview of a report including evidence payload."""
    preview = get_report_preview(report_id)
    if preview is None:
        return api_error("Content report not found", 404)
    return jsonify(preview), 200


@admin_control_bp.route("/content-reports/<int:report_id>/resolve", methods=["POST"])
@admin_required
def resolve_content_report_endpoint(report_id: int):
    """Resolve report by banning content (and optionally author) or dismissing."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)

    action = body.get("action")
    if not isinstance(action, str) or action not in ("ban", "dismiss"):
        return api_error("Action must be 'ban' or 'dismiss'", 400)

    ban_author = bool(body.get("ban_author", False))
    admin_notes = body.get("admin_notes")
    if admin_notes is not None and not isinstance(admin_notes, str):
        return api_error("admin_notes must be a string", 400)
    author_action = body.get("author_action")
    if author_action is not None and not isinstance(author_action, str):
        return api_error("author_action must be a string", 400)

    resp, status_code = resolve_report(
        admin=g.current_user,
        report_id=report_id,
        action=action,
        ban_author=ban_author,
        admin_notes=admin_notes,
        author_action=author_action,
        duration_days=body.get("duration_days"),
        facts=body.get("facts"),
        rule_ref=body.get("rule_ref"),
    )
    return jsonify(resp), status_code


@admin_control_bp.route("/users/<int:user_id>/sanctions", methods=["GET"])
@admin_required
def list_sanctions_for_user(user_id: int):
    """A user's warnings, suspensions and bans (newest first) with a summary of where they stand."""
    if db.session.get(User, user_id) is None:
        return api_error("User not found", 404)
    return jsonify({"sanctions": list_user_sanctions(user_id), "summary": moderation_summary(user_id)}), 200


@admin_control_bp.route("/users/<int:user_id>/sanctions", methods=["POST"])
@admin_required
def issue_sanction_for_user(user_id: int):
    """Warn, suspend (duration_days) or ban a user; the reasons are emailed to them."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)
    try:
        sanction = apply_sanction(g.current_user, user_id, body)
    except ModerationError as err:
        return api_error(err.message, err.status)
    return jsonify({"status": "success", "sanction": sanction.to_dict()}), 201


@admin_control_bp.route("/sanctions/preview", methods=["POST"])
@admin_required
def preview_sanction_message():
    """What a decision would tell the account holder (the email, in their language), saving nothing."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)
    try:
        return jsonify(preview_sanction(body)), 200
    except ModerationError as err:
        return api_error(err.message, err.status)


@admin_control_bp.route("/sanctions/<int:sanction_id>/revoke", methods=["POST"])
@admin_required
def revoke_user_sanction(sanction_id: int):
    """Take a sanction back (a reason is required); a lifted suspension or ban is emailed."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)
    try:
        sanction = revoke_sanction(g.current_user, sanction_id, body.get("reason"))
    except ModerationError as err:
        return api_error(err.message, err.status)
    return jsonify({"status": "success", "sanction": sanction.to_dict()}), 200


@admin_control_bp.route("/users/<int:user_id>/restore", methods=["POST"])
@admin_required
def restore_user_account(user_id: int):
    """Lift every running suspension and ban of a user."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return api_error("Invalid JSON body", 400)
    reason = body.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        return api_error("reason is required", 400)
    try:
        lifted = restore_account(g.current_user, user_id, reason.strip())
    except ModerationError as err:
        return api_error(err.message, err.status)
    return jsonify({"status": "success", "lifted": lifted}), 200


# The backup routes (export, import, purge) live in their own module on this blueprint.
from app.routes import admin_database  # noqa: E402,F401
