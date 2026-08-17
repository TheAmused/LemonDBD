import logging
from flask import Blueprint, request, jsonify, g
from app.services.user_service import UserService
from app.services.ownership_service import OwnershipService
from app.utils.auth_helper import login_required, admin_required, get_current_user

logger = logging.getLogger(__name__)
users_bp = Blueprint("users_bp", __name__, url_prefix="/api/v1")

user_service = UserService()
ownership_service = OwnershipService()


# ─── ADMIN USER MANAGEMENT ───────────────────────────────────────────

@users_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    search = request.args.get("search")
    role = request.args.get("role")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    result = user_service.get_all_users(search=search, role=role, page=page, per_page=per_page)
    return jsonify(result), 200


@users_bp.route("/users/<int:user_id>", methods=["GET"])
@login_required
def get_user_detail(user_id):
    # Allow self or admin
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized access to user profile.", "status": 403}), 403

    user = user_service.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found.", "status": 404}), 404

    summary = ownership_service.get_user_ownership_summary(user_id)
    return jsonify({
        "user": user.to_dict(),
        "ownership": summary,
    }), 200


@users_bp.route("/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user_by_admin(user_id):
    data = request.get_json() or {}
    role = data.get("role")
    is_active = data.get("is_active")

    user, err = user_service.admin_update_user(user_id, role=role, is_active=is_active)
    if err:
        return jsonify({"error": err, "status": 400}), 400

    return jsonify({
        "status": "success",
        "message": "User updated successfully",
        "user": user.to_dict(),
    }), 200


@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user_by_admin(user_id):
    if g.current_user.id == user_id:
        return jsonify({"error": "Cannot delete your own admin account.", "status": 400}), 400

    success = user_service.admin_delete_user(user_id)
    if not success:
        return jsonify({"error": "User not found.", "status": 404}), 404

    return jsonify({"status": "success", "message": "User deleted successfully."}), 200


@users_bp.route("/admin/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    stats = user_service.get_admin_system_stats()
    return jsonify(stats), 200


# ─── USER CHARACTER OWNERSHIP CRUD & BULK CRUD ────────────────────────

@users_bp.route("/users/<int:user_id>/characters", methods=["GET"])
@login_required
def get_user_characters(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized access to character ownership.", "status": 403}), 403

    role = request.args.get("role")
    characters = ownership_service.get_user_characters(user_id, role=role)
    return jsonify({
        "user_id": user_id,
        "count": len(characters),
        "data": characters,
    }), 200


@users_bp.route("/users/<int:user_id>/characters", methods=["POST", "PUT"])
@login_required
def set_single_character_ownership(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    data = request.get_json() or {}
    character_id = data.get("character_id")
    is_owned = bool(data.get("is_owned", True))

    if not character_id:
        return jsonify({"error": "character_id is required.", "status": 400}), 400

    try:
        result = ownership_service.set_character_ownership(user_id, int(character_id), is_owned)
        return jsonify({"status": "success", "data": result}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": 404}), 404


@users_bp.route("/users/<int:user_id>/characters/bulk", methods=["POST"])
@login_required
def bulk_set_character_ownership(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    data = request.get_json() or {}
    updates = data.get("updates", [])

    if not isinstance(updates, list):
        return jsonify({"error": "updates must be a list of {character_id, is_owned}.", "status": 400}), 400

    result = ownership_service.bulk_set_character_ownership(user_id, updates)
    return jsonify({"status": "success", "data": result}), 200


# ─── USER PERK OWNERSHIP CRUD & BULK CRUD ─────────────────────────────

@users_bp.route("/users/<int:user_id>/perks", methods=["GET"])
@login_required
def get_user_perks(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized access to perk ownership.", "status": 403}), 403

    category = request.args.get("category")
    perks = ownership_service.get_user_perks(user_id, category=category)
    return jsonify({
        "user_id": user_id,
        "count": len(perks),
        "data": perks,
    }), 200


@users_bp.route("/users/<int:user_id>/perks", methods=["POST", "PUT"])
@login_required
def set_single_perk_ownership(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    data = request.get_json() or {}
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
def bulk_set_perk_ownership(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    data = request.get_json() or {}
    updates = data.get("updates", [])

    if not isinstance(updates, list):
        return jsonify({"error": "updates must be a list of {perk_id, is_unlocked}.", "status": 400}), 400

    result = ownership_service.bulk_set_perk_ownership(user_id, updates)
    return jsonify({"status": "success", "data": result}), 200


@users_bp.route("/users/<int:user_id>/ownership/summary", methods=["GET"])
@login_required
def get_user_ownership_summary(user_id):
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    summary = ownership_service.get_user_ownership_summary(user_id)
    return jsonify(summary), 200
