# backend/app/routes/users.py
import logging
from flask import Blueprint, Response, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy import delete, or_, select

from app.core.extensions import db
from app.core.limiter import limiter
from app.core.security import admin_required, login_required, verify_password
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
from app.services.user import (
    admin_modify_user,
    admin_remove_user,
    create_user_account,
    export_filename,
    export_user_data,
    fetch_user_by_id,
    get_user_showcase as fetch_user_showcase,
    list_all_users_paginated,
    mark_onboarding_complete,
    set_preferred_language,
    two_factor,
    update_user_showcase as modify_user_showcase,
)
from app.utils.downloads import json_download_response
from app.utils.responses import api_error

logger = logging.getLogger(__name__)
users_bp = Blueprint("users_bp", __name__, url_prefix="/api/v1")

ownership_service = OwnershipService()


def _other_admin_confirmation_error(target, password: str | None) -> tuple[Response, int] | None:
    """A 403 unless the acting admin re-entered their own password, when `target` is another admin.

    Sanctions already refuse admin targets; demoting or resetting the second factor of another
    admin did not, so one stolen admin session could strip every other admin. Re-entering the
    password is what a stolen session cookie cannot do.
    """
    actor = g.current_user
    if target is None or target.role != "admin" or target.id == actor.id:
        return None
    if not actor.password_hash:
        return api_error("Set a password on your own account before changing another administrator.", 403)
    if not password or not verify_password(str(password), actor.password_hash):
        return api_error("Confirm with your own password to change another administrator.", 403)
    return None


def _self_or_admin_error(user_id: int, message: str = "Unauthorized.") -> tuple[Response, int] | None:
    """Return a 403 response if the current user is neither `user_id` nor an
    admin, else None. Shared by every per-user route so the same access rule
    (self or admin) can't drift between handlers."""
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return api_error(message, 403)
    return None


@users_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    """List registered users, filtered by search text, role and standing (active/suspended/banned), paginated."""
    search = request.args.get("search")
    role = request.args.get("role")
    standing = request.args.get("standing")
    page, per_page = paginate_args(default_per_page=20)

    result = list_all_users_paginated(search=search, role=role, page=page, per_page=per_page, standing=standing)
    return jsonify(result), 200


@users_bp.route("/users", methods=["POST"])
@admin_required
def create_user_by_admin():
    """Create a new user account directly via administrative privileges."""
    payload = request.get_json(silent=True) or {}

    try:
        validated_data = UserCreate.model_validate(payload)
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    user, err = create_user_account(
        login=validated_data.login,
        username=validated_data.username,
        email=validated_data.email,
        password=validated_data.password,
        role=validated_data.role or "user",
        avatar_url=validated_data.avatar_url or "default_avatar",
    )
    if err:
        return api_error(err, 400)

    ownership_service.seed_default_ownership_for_new_user(user.id)
    log_admin_action(
        g.current_user.id,
        action="user_created",
        target_type="user",
        target_id=user.id,
        details={"login": user.login, "role": user.role},
    )

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

    user = fetch_user_by_id(user_id)
    if not user:
        return api_error("User not found.", 404)

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
    data = export_user_data(user_id, requested_by="admin")
    if data is None:
        return api_error("User not found.", 404)

    log_admin_action(g.current_user.id, action="user_data_exported", target_type="user", target_id=user_id)
    return json_download_response(data, export_filename(user_id, "admin"))


@users_bp.route("/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user_by_admin(user_id: int):
    """Update a user's role, display name, e-mail verification or active status."""
    payload = request.get_json(silent=True) or {}

    try:
        validated_data = UserUpdate.model_validate(payload)
    except ValidationError as err:
        return api_error("Validation failed", 400, details=err.errors())

    # Taking the admin role from another admin needs the acting admin's password (banning one is
    # refused by the sanctions themselves).
    if (validated_data.role or "").lower() == "user":
        if err_resp := _other_admin_confirmation_error(fetch_user_by_id(user_id), validated_data.current_password):
            return err_resp

    user, err = admin_modify_user(
        user_id=user_id,
        role=validated_data.role,
        is_active=validated_data.is_active,
        acting_admin=g.current_user,
        username=validated_data.username,
        is_verified=validated_data.is_verified,
    )
    if err:
        return api_error(err, 400)

    log_admin_action(
        g.current_user.id,
        action="user_updated",
        target_type="user",
        target_id=user_id,
        details=validated_data.model_dump(exclude_none=True, exclude={"current_password"}),
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
    target = fetch_user_by_id(user_id)
    if not target:
        return api_error("User not found.", 404)
    body = request.get_json(silent=True) or {}
    if err_resp := _other_admin_confirmation_error(target, body.get("current_password")):
        return err_resp

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
        return api_error("Cannot delete your own admin account.", 400)
    target = fetch_user_by_id(user_id)
    if target is not None and target.role == "admin":
        # Like sanctions, deletion never targets an admin: take the admin role away first (which
        # needs the acting admin's password), then delete the account.
        return api_error("Remove the admin role before deleting this account.", 400)

    success = admin_remove_user(user_id)
    if not success:
        return api_error("User not found.", 404)

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
        return api_error("character_id is required.", 400)
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
                return api_error("role is required and must be 'survivor' or 'killer'.", 400)

    try:
        result = ownership_service.set_character_ownership(
            user_id, int(character_id), is_owned, role=role
        )
        return jsonify({"status": "success", "data": result}), 200
    except ValueError as ve:
        return api_error(str(ve), 404)


@users_bp.route("/users/<int:user_id>/characters/bulk", methods=["POST"])
@login_required
def bulk_set_character_ownership(user_id: int):
    """Bulk update character ownership states."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    updates = data.get("updates", [])

    try:
        result = ownership_service.bulk_set_character_ownership(user_id, updates)
    except ValueError as err:
        return api_error(str(err), 400)
    return jsonify({"status": "success", "data": result}), 200


@users_bp.route("/users/<int:user_id>/onboarding/complete", methods=["POST"])
@login_required
def mark_user_onboarding_complete(user_id: int):
    """Stamp the character-ownership onboarding wizard as done."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    user, err = mark_onboarding_complete(user_id)
    if err:
        return api_error(err, 404)

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
        return api_error("language is required.", 400)

    user, err = set_preferred_language(user_id, language)
    if err:
        status = 404 if err == "User not found." else 400
        return api_error(err, status)

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
    for perk in perks:
        # Every language's name and description, per perk: ~70% of the payload and never read by
        # a client (each row is already localized for `lang`).
        perk.pop("translations", None)
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
        return api_error("perk_id is required.", 400)

    try:
        result = ownership_service.set_perk_ownership(user_id, int(perk_id), is_unlocked)
        return jsonify({"status": "success", "data": result}), 200
    except ValueError as ve:
        return api_error(str(ve), 404)


@users_bp.route("/users/<int:user_id>/perks/bulk", methods=["POST"])
@login_required
def bulk_set_perk_ownership(user_id: int):
    """Bulk update perk unlock states."""
    if err_resp := _self_or_admin_error(user_id):
        return err_resp

    data = request.get_json(silent=True) or {}
    updates = data.get("updates", [])

    try:
        result = ownership_service.bulk_set_perk_ownership(user_id, updates)
    except ValueError as err:
        return api_error(str(err), 400)
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
@login_required
def get_user_showcase(user_id: int):
    """Retrieve custom player showcase data (title, devotion, mains, perks).

    Self or admin only, like every other per-user route: nothing public shows a showcase, and an
    open endpoint let anyone walk the sequential ids to see which accounts exist.
    """
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to user profile."):
        return err_resp
    user = fetch_user_by_id(user_id)
    if not user:
        return api_error("User not found.", 404)

    data = fetch_user_showcase(user_id)
    return jsonify({"status": "success", "data": data}), 200


@users_bp.route("/users/<int:user_id>/showcase", methods=["PUT"])
@login_required
def update_user_showcase(user_id: int):
    """Update custom player showcase attributes."""
    if err_resp := _self_or_admin_error(user_id, "Unauthorized access to user profile."):
        return err_resp

    user = fetch_user_by_id(user_id)
    if not user:
        return api_error("User not found.", 404)

    payload = request.get_json(silent=True) or {}
    saved, err = modify_user_showcase(user_id, payload)
    if err:
        return api_error(err, 400)

    return jsonify({"status": "success", "data": saved}), 200
