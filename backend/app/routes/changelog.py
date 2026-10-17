# backend/app/routes/changelog.py
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.security import admin_required
from app.schemas.changelog import ChangelogPostCreate, ChangelogPostUpdate
from app.services import changelog_discord, changelog_service
from app.services.admin_control_service import log_admin_action
from app.utils.pagination import paginate_args

changelog_bp = Blueprint("changelog", __name__, url_prefix="/api/v1/changelog")


@changelog_bp.route("", methods=["GET"])
def get_changelog_posts():
    """Public feed for the 'What's New?' drawer -- published posts only."""
    page, per_page = paginate_args(default_per_page=20, max_per_page=50)

    result = changelog_service.list_posts(page=page, per_page=per_page, include_unpublished=False)
    return jsonify({"status": "success", **result}), 200


@changelog_bp.route("/admin", methods=["GET"])
@admin_required
def get_changelog_posts_admin():
    """Admin feed -- includes drafts/unpublished posts for management."""
    page, per_page = paginate_args(default_per_page=50, max_per_page=50)

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
        details={"title": post.title},
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


@changelog_bp.route("/<int:post_id>/announce", methods=["POST"])
@admin_required
def announce_changelog_post(post_id: int):
    """Posts a published entry to the team's Discord channel, once. The Discord outcome ("sent", "failed",
    "not_configured") comes back in `discord`; only "sent" marks the entry as announced, so a failure can
    be retried."""
    post = changelog_service.get_post(post_id)
    if not post:
        return jsonify({"error": "Changelog post not found"}), 404
    if not post.is_published:
        return jsonify({"error": "Only a published entry can be announced"}), 400
    if post.discord_announced_at is not None:
        return jsonify({"error": "This entry was already announced on Discord"}), 409

    announcement = changelog_discord.announce_post(post)
    if announcement.result == "sent":
        changelog_service.mark_announced(post, announcement.message_id)
        log_admin_action(
            g.current_user.id, "changelog.announce", target_type="changelog_post", target_id=post.id,
        )
    return jsonify({"status": "success", "data": post.to_dict(), "discord": announcement.result}), 200


@changelog_bp.route("/<int:post_id>/announce", methods=["PUT"])
@admin_required
def update_changelog_announcement(post_id: int):
    """Rewrites the entry's Discord message after the entry was edited. Only possible for a message this
    site posted itself (its id was kept). If the message was deleted on Discord ("missing") the entry goes
    back to "not announced", so it can be sent again."""
    post = changelog_service.get_post(post_id)
    if not post:
        return jsonify({"error": "Changelog post not found"}), 404
    if not post.is_published:
        return jsonify({"error": "Only a published entry can be announced"}), 400
    if post.discord_message_id is None:
        return jsonify({"error": "This entry has no Discord message to update"}), 409

    result = changelog_discord.update_announcement(post)
    if result == "sent":
        changelog_service.mark_discord_synced(post)
        log_admin_action(
            g.current_user.id, "changelog.announce_update", target_type="changelog_post", target_id=post.id,
        )
    elif result == "missing":
        changelog_service.clear_announcement(post)
    return jsonify({"status": "success", "data": post.to_dict(), "discord": result}), 200


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
