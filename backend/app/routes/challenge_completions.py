# backend/app/routes/challenge_completions.py
from flask import Blueprint, g, jsonify
from app.core.security import login_required
from app.services.challenge_completions import fetch_completed_variants_by_mode

challenge_completions_bp = Blueprint(
    "challenge_completions", __name__, url_prefix="/api/v1/challenge-completions"
)


@challenge_completions_bp.route("/status", methods=["GET"])
@login_required
def get_completion_status():
    """Every mode+variant this user has ever fully completed, grouped by mode.

    Drives "already won" trophy badges on challenge cards and difficulty
    tiles -- e.g. {"chaos": ["easy", "hell"], "gauntlet": ["killer_original"]}.
    """
    status = fetch_completed_variants_by_mode(g.current_user.id)
    return jsonify(status), 200
