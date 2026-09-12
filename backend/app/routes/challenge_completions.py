# backend/app/routes/challenge_completions.py
from flask import Blueprint, g, jsonify
from app.core.security import login_required
from app.services.challenge_completions import (
    fetch_active_run_variants_by_mode,
    fetch_completed_variants_by_mode,
)

challenge_completions_bp = Blueprint(
    "challenge_completions", __name__, url_prefix="/api/v1/challenge-completions"
)


@challenge_completions_bp.route("/status", methods=["GET"])
@login_required
def get_completion_status():
    """Every mode+variant this user has ever fully completed, plus which ones
    currently have an in-progress run -- e.g.
    {"completions": {"chaos": ["easy", "hell"]}, "active_runs": {"chaos": ["medium"]}}.

    `completions` drives "already won" trophy badges on challenge cards and
    difficulty tiles; `active_runs` lets the frontend tell a genuinely
    finished tier apart from one that was completed before but has since
    been reset and is being replayed.
    """
    completions = fetch_completed_variants_by_mode(g.current_user.id)
    active_runs = fetch_active_run_variants_by_mode(g.current_user.id)
    return jsonify({"completions": completions, "active_runs": active_runs}), 200
