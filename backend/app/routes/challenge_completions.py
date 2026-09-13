# backend/app/routes/challenge_completions.py
from flask import Blueprint, g, jsonify
from app.core.security import login_required
from app.services.challenge_completions import (
    fetch_active_run_variants_by_mode,
    fetch_completed_variants_by_mode,
    fetch_completion_counts_by_mode,
    fetch_full_roster_counts_by_mode,
)
from app.services.ownership_service import OwnershipService
from app.services.page_streak import ROSTER_COMPLETE_VARIANT, get_live_roster_badge

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
    been reset and is being replayed; `completion_counts` is the killer
    count frozen at a variant's most recent completion (gold badge, any
    roster size); `full_roster` upgrades a card's badge to the red "beaten
    with the entire game roster" variant, with the killer count frozen at
    that specific completion.

    Page Streak has no completion row to read here -- unlike the other three
    modes it has no bounded run to freeze a pool against, so its badge is
    computed live and merged in under the synthetic "roster_complete"
    variant to match the shape the other modes already produce.
    """
    completions = fetch_completed_variants_by_mode(g.current_user.id)
    active_runs = fetch_active_run_variants_by_mode(g.current_user.id)
    completion_counts = fetch_completion_counts_by_mode(g.current_user.id)
    full_roster = fetch_full_roster_counts_by_mode(g.current_user.id)

    page_streak_badge = get_live_roster_badge(g.current_user.id, OwnershipService())
    if page_streak_badge["completed"]:
        completions.setdefault("page_streak", []).append(ROSTER_COMPLETE_VARIANT)
        completion_counts.setdefault("page_streak", {})[ROSTER_COMPLETE_VARIANT] = page_streak_badge["killer_count"]
        if page_streak_badge["full_roster"]:
            full_roster.setdefault("page_streak", {})[ROSTER_COMPLETE_VARIANT] = page_streak_badge["killer_count"]

    return jsonify(
        {
            "completions": completions,
            "active_runs": active_runs,
            "completion_counts": completion_counts,
            "full_roster": full_roster,
        }
    ), 200
