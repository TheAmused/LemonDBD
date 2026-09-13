# backend/app/routes/users.py
import logging
from datetime import datetime, timezone
from flask import Blueprint, Response, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy import delete

from app.core.extensions import db
from app.core.json_provider import safe_json_dumps, safe_json_loads
from app.core.security import admin_required, login_required
from app.models import (
    ItemAddon,
    Killer,
    KillerAddon,
    Survivor,
    GauntletRun,
    Item,
    MapRealm,
    PageStreakRun,
    Perk,
    Realm,
    UserCharacterOwnership,
    UserPerkOwnership,
)
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.admin_control_service import log_admin_action
from app.services.db.export_import import DatabaseExportImportService
from app.services.ownership_service import OwnershipService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
users_bp = Blueprint("users_bp", __name__, url_prefix="/api/v1")

user_service = UserService()
ownership_service = OwnershipService()


def _self_or_admin_error(user_id: int, message: str = "Unauthorized.") -> tuple[Response, int] | None:
    """Return a 403 response if the current user is neither `user_id` nor an
    admin, else None. Shared by every per-user route so the same access rule
    (self or admin) can't drift between handlers."""
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": message, "status": 403}), 403
    return None


@users_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    """List all registered users with optional search filtering and pagination."""
    search = request.args.get("search")
    role = request.args.get("role")
    page = request.args.get("page", default=1, type=int)
    per_page = request.args.get("per_page", default=20, type=int)

    result = user_service.get_all_users(search=search, role=role, page=page, per_page=per_page)
    return jsonify(result), 200


@users_bp.route("/users", methods=["POST"])
@admin_required
def create_user_by_admin():
    """Create a new user account directly via administrative privileges."""
    payload = request.get_json(silent=True) or {}

    try:
        validated_data = UserCreate.model_validate(payload)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.errors(), "status": 400}), 400

    user, err = user_service.register_user(
        username=validated_data.username,
        email=validated_data.email,
        password=validated_data.password,
        role=validated_data.role or "user",
        avatar_url=validated_data.avatar_url or "default_avatar",
    )
    if err:
        return jsonify({"error": err, "status": 400}), 400

    ownership_service.seed_default_ownership_for_new_user(user.id)

    return jsonify({
        "status": "success",
        "message": "User created successfully by admin",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 201


@users_bp.route("/users/<int:user_id>", methods=["GET"])
@login_required
def get_user_detail(user_id: int):
    """Retrieve detailed user account and ownership information."""
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to user profile."):
        return err_resp

    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found.", "status": 404}), 404

    summary = ownership_service.get_user_ownership_summary(user_id)
    return jsonify({
        "user": UserResponse.model_validate(user).model_dump(),
        "ownership": summary,
    }), 200


@users_bp.route("/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user_by_admin(user_id: int):
    """Update role or active status for a specific user."""
    payload = request.get_json(silent=True) or {}

    try:
        validated_data = UserUpdate.model_validate(payload)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.errors(), "status": 400}), 400

    user, err = user_service.admin_update_user(
        user_id=user_id,
        role=validated_data.role,
        is_active=validated_data.is_active,
    )
    if err:
        return jsonify({"error": err, "status": 400}), 400

    log_admin_action(
        g.current_user.id,
        action="user_updated",
        target_type="user",
        target_id=user_id,
        details={"role": validated_data.role, "is_active": validated_data.is_active},
    )

    return jsonify({
        "status": "success",
        "message": "User updated successfully",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 200


@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user_by_admin(user_id: int):
    """Delete a user account and associated assets."""
    if g.current_user.id == user_id:
        return jsonify({"error": "Cannot delete your own admin account.", "status": 400}), 400

    success = user_service.admin_delete_user(user_id)
    if not success:
        return jsonify({"error": "User not found.", "status": 404}), 404

    log_admin_action(g.current_user.id, action="user_deleted", target_type="user", target_id=user_id)

    return jsonify({"status": "success", "message": "User deleted successfully."}), 200


@users_bp.route("/admin/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    """Retrieve system-wide entity and registration metrics."""
    stats = user_service.get_admin_system_stats()
    return jsonify(stats), 200


@users_bp.route("/admin/database/purge", methods=["POST"])
@admin_required
def purge_database_tables():
    """Purge specific database entity tables on demand."""
    data = request.get_json(silent=True) or {}
    targets: list[str] = data.get("targets", [])
    if not isinstance(targets, list) or not targets:
        return jsonify({"error": "No valid purge targets specified.", "status": 400}), 400

    purged: list[str] = []
    try:
        # Order matters now that these are real foreign keys: add-ons
        # reference both characters and item categories, perks reference
        # characters, items reference item categories. Children first.
        if "perks" in targets:
            db.session.execute(delete(Perk))
            purged.append("perks")

        if "addons" in targets:
            # One target, two tables: `addons` split into `killer_addons` (880
            # rows) and `item_addons` (51). The purge target keeps its name
            # because it is what the admin UI sends, and it still means every
            # add-on in the game.
            db.session.execute(delete(KillerAddon))
            db.session.execute(delete(ItemAddon))
            purged.append("addons")

        if "characters" in targets:
            # Only `killer_addons` references a killer, so only it has to be
            # cleared ahead of the characters; the 51 item add-ons hang off
            # `item_categories` and survive a character purge.
            db.session.execute(delete(KillerAddon))
            db.session.execute(delete(Survivor))
            db.session.execute(delete(Killer))
            purged.append("characters")

        if "items" in targets:
            db.session.execute(delete(Item))
            purged.append("items")

        if "maps" in targets:
            # `map_tiles` and `map_objectives` used to be cleared here. Neither
            # table exists: one was empty on all 58 maps and the other held
            # five placeholder names copied onto every one of them.
            db.session.execute(delete(MapRealm))
            db.session.execute(delete(Realm))
            purged.append("maps")

        if "ownerships" in targets:
            db.session.execute(delete(UserCharacterOwnership))
            db.session.execute(delete(UserPerkOwnership))
            purged.append("ownerships")

        if "game_runs" in targets:
            db.session.execute(delete(GauntletRun))
            db.session.execute(delete(PageStreakRun))
            purged.append("game_runs")

        db.session.commit()
        logger.info(f"Admin {g.current_user.username} purged tables: {purged}")
        return jsonify({
            "status": "success",
            "message": f"Successfully purged tables: {', '.join(purged)}",
            "purged_tables": purged,
            "stats": user_service.get_admin_system_stats(),
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error purging database tables: {e}", exc_info=True)
        return jsonify({"error": f"Database purge failed: {str(e)}", "status": 500}), 500


@users_bp.route("/admin/database/export", methods=["GET"])
@admin_required
def export_database():
    """Export complete or selective database entities as JSON."""
    targets_param = request.args.get("targets")
    targets = [t.strip() for t in targets_param.split(",") if t.strip()] if targets_param else None
    include_assets = request.args.get("include_assets", "true").lower() not in ["false", "0", "no"]

    try:
        data = DatabaseExportImportService.export_database(targets=targets, include_assets=include_assets)
        download = request.args.get("download", "false").lower() in ["true", "1", "yes"]
        if download:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            json_str = safe_json_dumps(data)
            return Response(
                json_str,
                mimetype="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=lemondbd_export_{timestamp}.json"
                },
            )
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Database export error: {e}", exc_info=True)
        return jsonify({"error": f"Failed to export database: {str(e)}", "status": 500}), 500


@users_bp.route("/admin/database/import", methods=["POST"])
@admin_required
def import_database():
    """Import database entities from JSON payload or uploaded .json file."""
    mode = request.form.get("mode") or request.args.get("mode") or "merge"
    targets_param = request.form.get("targets") or request.args.get("targets")
    targets = [t.strip() for t in targets_param.split(",") if t.strip()] if targets_param else None

    payload = None

    if "file" in request.files:
        file = request.files["file"]
        if not file or not file.filename:
            return jsonify({"error": "Uploaded file is empty.", "status": 400}), 400
        try:
            content = file.read().decode("utf-8")
            payload = safe_json_loads(content)
        except Exception as json_err:
            return jsonify({"error": f"Invalid JSON file: {str(json_err)}", "status": 400}), 400

    if payload is None:
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            return jsonify({"error": "Invalid JSON payload: root must be an object.", "status": 400}), 400
        mode = body.get("mode", mode)
        if "targets" in body and isinstance(body["targets"], list):
            targets = body["targets"]
        payload = body.get("data", body)

    if not payload or not isinstance(payload, dict):
        return jsonify({"error": "No valid JSON payload provided for import.", "status": 400}), 400

    try:
        result = DatabaseExportImportService.import_database(
            payload=payload,
            mode=mode,
            targets=targets,
        )
        logger.info(f"Admin {g.current_user.username} imported database (mode={mode}): {result.get('summary')}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Database import error: {e}", exc_info=True)
        return jsonify({"error": f"Database import failed: {str(e)}", "status": 500}), 500


@users_bp.route("/users/<int:user_id>/characters", methods=["GET"])
@login_required
def get_user_characters(user_id: int):
    """Retrieve character ownership flags for a user."""
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to character ownership."):
        return err_resp

    # Ownership rows double as the identifier gauntlet/chaos runs match against,
    # so translation here is opt-in via an explicit `lang` param only -- never
    # inferred from Referer/Accept-Language like the public catalog endpoints,
    # or a same-origin request would silently translate `name` out from under
    # any run-state comparison keyed on the canonical English name.
    role = request.args.get("role")
    characters = ownership_service.get_user_characters(user_id, role=role, lang=request.args.get("lang"))
    return jsonify({
        "user_id": user_id,
        "count": len(characters),
        "data": characters,
    }), 200


@users_bp.route("/users/<int:user_id>/characters", methods=["POST", "PUT"])
@login_required
def set_single_character_ownership(user_id: int):
    """Toggle or set character ownership for a single character."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    character_id = data.get("character_id")
    role = data.get("role")
    is_owned = bool(data.get("is_owned", True))

    if not character_id:
        return jsonify({"error": "character_id is required.", "status": 400}), 400
    if not role:
        # Survivor 7 and killer 7 are different characters, so an id alone
        # would silently toggle whichever table happened to be checked first.
        return jsonify({
            "error": "role is required and must be 'survivor' or 'killer'.",
            "status": 400,
        }), 400

    try:
        result = ownership_service.set_character_ownership(
            user_id, int(character_id), is_owned, role=role
        )
        return jsonify({"status": "success", "data": result}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": 404}), 404


@users_bp.route("/users/<int:user_id>/characters/bulk", methods=["POST"])
@login_required
def bulk_set_character_ownership(user_id: int):
    """Bulk update character ownership states."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    updates = data.get("updates", [])

    if not isinstance(updates, list):
        return jsonify({
            "error": "updates must be a list of {character_id, role, is_owned}.",
            "status": 400,
        }), 400

    result = ownership_service.bulk_set_character_ownership(user_id, updates)
    return jsonify({"status": "success", "data": result}), 200


@users_bp.route("/users/<int:user_id>/onboarding/complete", methods=["POST"])
@login_required
def mark_user_onboarding_complete(user_id: int):
    """Stamp the character-ownership onboarding wizard as done."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    user, err = user_service.mark_onboarding_complete(user_id)
    if err:
        return jsonify({"error": err, "status": 404}), 404

    return jsonify({
        "status": "success",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 200


@users_bp.route("/users/<int:user_id>/language", methods=["POST"])
@login_required
def set_user_preferred_language(user_id: int):
    """Set the user's preferred site language (onboarding wizard's language step)."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    language = data.get("language")
    if not isinstance(language, str) or not language:
        return jsonify({"error": "language is required.", "status": 400}), 400

    user, err = user_service.set_preferred_language(user_id, language)
    if err:
        status = 404 if err == "User not found." else 400
        return jsonify({"error": err, "status": status}), status

    return jsonify({
        "status": "success",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 200


@users_bp.route("/users/<int:user_id>/perks", methods=["GET"])
@login_required
def get_user_perks(user_id: int):
    """Retrieve perk unlock status for a specific user."""
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to perk ownership."):
        return err_resp

    # Same opt-in-only rule as get_user_characters: perk `name` here is matched
    # against run-state build slots, so it must stay in the caller's control.
    category = request.args.get("category")
    perks = ownership_service.get_user_perks(user_id, category=category, lang=request.args.get("lang"))
    return jsonify({
        "user_id": user_id,
        "count": len(perks),
        "data": perks,
    }), 200


@users_bp.route("/users/<int:user_id>/perks", methods=["POST", "PUT"])
@login_required
def set_single_perk_ownership(user_id: int):
    """Toggle or set perk unlock state for a single perk."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    perk_id = data.get("perk_id")
    is_unlocked = bool(data.get("is_unlocked", True))

    if not perk_id:
        return jsonify({"error": "perk_id is required.", "status": 400}), 400

    try:
        result = ownership_service.set_perk_ownership(user_id, int(perk_id), is_unlocked)
        return jsonify({"status": "success", "data": result}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": 404}), 404


@users_bp.route("/users/<int:user_id>/perks/bulk", methods=["POST"])
@login_required
def bulk_set_perk_ownership(user_id: int):
    """Bulk update perk unlock states."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    updates = data.get("updates", [])

    if not isinstance(updates, list):
        return jsonify({"error": "updates must be a list of {perk_id, is_unlocked}.", "status": 400}), 400

    result = ownership_service.bulk_set_perk_ownership(user_id, updates)
    return jsonify({"status": "success", "data": result}), 200


@users_bp.route("/users/<int:user_id>/ownership/summary", methods=["GET"])
@login_required
def get_user_ownership_summary(user_id: int):
    """Retrieve an aggregated overview of owned characters and unlocked perks."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    summary = ownership_service.get_user_ownership_summary(user_id)
    return jsonify(summary), 200


@users_bp.route("/users/<int:user_id>/showcase", methods=["GET"])
def get_user_showcase(user_id: int):
    """Retrieve custom player showcase data (title, devotion, mains, perks)."""
    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found.", "status": 404}), 404

    data = user_service.get_user_showcase(user_id)
    return jsonify({"status": "success", "data": data}), 200


@users_bp.route("/users/<int:user_id>/showcase", methods=["PUT"])
@login_required
def update_user_showcase(user_id: int):
    """Update custom player showcase attributes."""
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to user profile."):
        return err_resp

    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found.", "status": 404}), 404

    payload = request.get_json(silent=True) or {}
    saved, err = user_service.update_user_showcase(user_id, payload)
    if err:
        return jsonify({"error": err, "status": 400}), 400

    return jsonify({"status": "success", "data": saved}), 200
