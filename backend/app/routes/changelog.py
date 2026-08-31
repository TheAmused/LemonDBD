# backend/app/routes/changelog.py
import logging
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.security import admin_required
from app.schemas.changelog import ChangelogPostCreate, ChangelogPostUpdate
from app.services import changelog_service
from app.services.admin_control_service import log_admin_action

logger = logging.getLogger(__name__)

changelog_bp = Blueprint("changelog", __name__, url_prefix="/api/v1/changelog")


@changelog_bp.route("", methods=["GET"])
def get_changelog_posts():
    """Public feed for the 'What's New?' drawer -- published posts only."""
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
    except (TypeError, ValueError):
        page, per_page = 1, 20

    result = changelog_service.list_posts(page=page, per_page=per_page, include_unpublished=False)
    return jsonify({"status": "success", **result}), 200


@changelog_bp.route("/admin", methods=["GET"])
@admin_required
def get_changelog_posts_admin():
    """Admin feed -- includes drafts/unpublished posts for management."""
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
    except (TypeError, ValueError):
        page, per_page = 1, 50

    result = changelog_service.list_posts(page=page, per_page=per_page, include_unpublished=True)
    return jsonify({"status": "success", **result}), 200


@changelog_bp.route("", methods=["POST"])
@admin_required
def create_changelog_post():
    body = request.get_json(silent=True) or {}
    try:
        payload = ChangelogPostCreate(**body)
    except ValidationError as err:
        return jsonify({"error": "Invalid changelog post", "details": err.errors()}), 400

    post = changelog_service.create_post(g.current_user, payload.model_dump())
    log_admin_action(
        g.current_user.id, "changelog.create", target_type="changelog_post", target_id=post.id,
        details={"title": post.title, "tag": post.tag},
    )
    return jsonify({"status": "success", "data": post.to_dict()}), 201


@changelog_bp.route("/<int:post_id>", methods=["PATCH", "PUT"])
@admin_required
def update_changelog_post(post_id: int):
    post = changelog_service.get_post(post_id)
    if not post:
        return jsonify({"error": "Changelog post not found"}), 404

    body = request.get_json(silent=True) or {}
    try:
        payload = ChangelogPostUpdate(**body)
    except ValidationError as err:
        return jsonify({"error": "Invalid changelog post", "details": err.errors()}), 400

    post = changelog_service.update_post(post, payload.model_dump(exclude_unset=True))
    log_admin_action(
        g.current_user.id, "changelog.update", target_type="changelog_post", target_id=post.id,
    )
    return jsonify({"status": "success", "data": post.to_dict()}), 200


@changelog_bp.route("/reorder", methods=["POST"])
@admin_required
def reorder_changelog_posts():
    """Persists a new drag-and-drop order from the admin 'What's New?' modal.
    Body: {"ordered_ids": [id, id, ...]} -- the full desired top-to-bottom order."""
    body = request.get_json(silent=True) or {}
    ordered_ids = body.get("ordered_ids")
    if not isinstance(ordered_ids, list) or not all(isinstance(i, int) for i in ordered_ids):
        return jsonify({"error": "'ordered_ids' must be a list of post ids"}), 400

    changelog_service.reorder_posts(ordered_ids)
    log_admin_action(
        g.current_user.id, "changelog.reorder", target_type="changelog_post",
        details={"ordered_ids": ordered_ids},
    )
    return jsonify({"status": "success"}), 200


@changelog_bp.route("/<int:post_id>", methods=["DELETE"])
@admin_required
def delete_changelog_post(post_id: int):
    post = changelog_service.get_post(post_id)
    if not post:
        return jsonify({"error": "Changelog post not found"}), 404

    changelog_service.delete_post(post)
    log_admin_action(
        g.current_user.id, "changelog.delete", target_type="changelog_post", target_id=post_id,
    )
    return jsonify({"status": "success"}), 200
