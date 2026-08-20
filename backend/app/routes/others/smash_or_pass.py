# backend/app/routes/others/smash_or_pass.py
import logging
from flask import Blueprint, jsonify, request
from app.core.security import get_current_user
from app.services.others.smash_or_pass_service import SmashOrPassService

logger = logging.getLogger(__name__)

smash_or_pass_bp = Blueprint("smash_or_pass", __name__, url_prefix="/api/v1/smash-or-pass")
smash_service = SmashOrPassService()


@smash_or_pass_bp.route("/editions", methods=["GET"])
def get_editions():
    """Retrieve available smash or pass editions."""
    try:
        editions = smash_service.get_editions()
        return jsonify({"data": editions}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass editions: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/characters", methods=["GET"])
def get_characters():
    """Retrieve character list with stats filtered by edition, role, gender, or search query."""
    edition = request.args.get("edition", "canon")
    role = request.args.get("role")
    gender = request.args.get("gender")
    search = request.args.get("q") or request.args.get("search")

    try:
        data = smash_service.get_characters_with_stats(
            edition=edition, role=role, gender=gender, search=search
        )
        return jsonify({"count": len(data), "data": data, "edition": edition}), 200
    except Exception as e:
        logger.error(f"Error fetching smash-or-pass characters: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/vote", methods=["POST"])
def cast_vote():
    """
    Cast a vote (smash, pass) for a given character.
    Only logged-in users with user_id count towards community leaderboard totals.
    """
    payload = request.get_json(silent=True) or {}
    character_slug = payload.get("character_slug") or payload.get("slug")
    vote_type = payload.get("vote_type") or payload.get("vote")
    edition = payload.get("edition", "canon")
    user_id = payload.get("user_id")
    session_id = payload.get("session_id") or request.headers.get("X-Session-ID")

    # Extract authenticated user if available
    current_user = get_current_user()
    if current_user and not user_id:
        user_id = current_user.id

    if not character_slug or not vote_type:
        return jsonify({"error": "Fields 'character_slug' and 'vote_type' are required"}), 400

    try:
        result = smash_service.cast_vote(
            character_slug=character_slug,
            vote_type=vote_type,
            edition=edition,
            user_id=user_id,
            session_id=session_id,
        )
        return jsonify({"data": result, "status": "success"}), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as e:
        logger.error(f"Error casting smash-or-pass vote: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/user-votes", methods=["GET"])
def get_user_votes():
    """Retrieve all votes cast by the current user for no-repeat deck filtering."""
    user_id = request.args.get("user_id", type=int)
    edition = request.args.get("edition", "canon")

    current_user = get_current_user()
    if current_user and not user_id:
        user_id = current_user.id

    if not user_id:
        return jsonify({"data": [], "message": "No user_id provided"}), 200

    try:
        votes = smash_service.get_user_votes(user_id=user_id, edition=edition)
        return jsonify({"data": votes, "count": len(votes)}), 200
    except Exception as e:
        logger.error(f"Error fetching user smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500


@smash_or_pass_bp.route("/user-votes/reset", methods=["POST"])
def reset_user_votes():
    """Reset and wipe all votes for a specific user and recalculate leaderboard."""
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id") or request.args.get("user_id", type=int)
    edition = payload.get("edition") or request.args.get("edition")

    current_user = get_current_user()
    if current_user and not user_id:
        user_id = current_user.id

    if not user_id:
        return jsonify({"error": "Field 'user_id' is required to reset user votes"}), 400

    try:
        result = smash_service.reset_user_votes(user_id=user_id, edition=edition)
        return jsonify({"data": result, "status": "success"}), 200
    except Exception as e:
        logger.error(f"Error resetting user smash-or-pass votes: {e}")
        return jsonify({"error": str(e)}), 500
