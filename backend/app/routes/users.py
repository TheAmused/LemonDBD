# backend/app/routes/users.py
import logging
from flask import Blueprint, Response, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy import delete, or_, select

from app.core.extensions import db
from app.core.limiter import limiter
from app.core.security import admin_required, login_required
from app.models import (
    Killer,
    Perk,
    Survivor,
    UserCharacterOwnership,
    UserPerkOwnership,
)
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.pagination import paginate_args
from app.services.admin_control_service import log_admin_action
from app.services.ownership_service import OwnershipService
from app.services.user import two_factor
from app.services.user_service import UserService
from app.utils.downloads import json_download_response

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
    page, per_page = paginate_args(default_per_page=20)

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
        login=validated_data.login,
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


@users_bp.route("/users/<int:user_id>/export", methods=["GET"])
@limiter.limit("30 per hour")
@admin_required
def export_user_data_by_admin(user_id: int):
    """Download one user's data as JSON (same file as the user's own `GET /auth/account/export`).

    Meant for answering an access / portability request sent by email, so it
    works for disabled accounts too. Password hashes and one-time codes are
    never included, and every download is written to the admin audit log.
    """
    data = user_service.export_user_data(user_id, requested_by="admin")
    if data is None:
        return jsonify({"error": "User not found.", "status": 404}), 404

    log_admin_action(g.current_user.id, action="user_data_exported", target_type="user", target_id=user_id)
    return json_download_response(data, user_service.export_filename(user_id, "admin"))


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


@users_bp.route("/users/<int:user_id>/two-factor/reset", methods=["POST"])
@limiter.limit("30 per hour")
@admin_required
def reset_user_two_factor(user_id: int):
    """Switch 2FA off for a user who lost their device and recovery codes (audited, the user is emailed)."""
    target = user_service.get_user_by_id(user_id)
    if not target:
        return jsonify({"error": "User not found.", "status": 404}), 404

    had_two_factor = two_factor.admin_reset(target)
    log_admin_action(
        g.current_user.id,
        action="user_two_factor_reset",
        target_type="user",
        target_id=user_id,
        details={"had_two_factor": had_two_factor},
    )
    return jsonify({"status": "success", "had_two_factor": had_two_factor}), 200


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
        existing_owner = db.session.scalars(
            select(UserCharacterOwnership).where(
                UserCharacterOwnership.user_id == user_id,
                or_(
                    UserCharacterOwnership.killer_id == int(character_id),
                    UserCharacterOwnership.survivor_id == int(character_id),
                ),
            )
        ).first()
        if existing_owner:
            role = "killer" if existing_owner.killer_id == int(character_id) else "survivor"
        else:
            k = db.session.get(Killer, int(character_id))
            s = db.session.get(Survivor, int(character_id))
            if k and not s:
                role = "killer"
            elif s and not k:
                role = "survivor"
            elif k:
                role = "killer"
            elif s:
                role = "survivor"
            else:
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
