# backend/app/routes/page_streak.py
from flask import g, jsonify, request
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint
from app.services.page_streak_service import PageStreakService
from app.utils.responses import api_error

get_page_streak_service = make_service_getter("PAGE_STREAK_SERVICE", PageStreakService)

page_streak_bp = make_streak_blueprint(
    name="page_streak",
    url_prefix="/api/v1/page-streak",
    get_service=get_page_streak_service,
    param_name="killer",
    valid_values=None,
    invalid_value_hint="required",
    has_reveal=False,
    get_run_method="get_run",
    stats_requires_param=False,
)


@page_streak_bp.route("/roster", methods=["GET"])
@login_required
def get_roster():
    """Retrieve the list of eligible characters for page streak runs."""
    service = get_page_streak_service()
    roster, milestone = service.get_roster_with_milestone(g.current_user.id)
    return jsonify({"count": len(roster), "data": roster, "milestone": milestone}), 200


@page_streak_bp.route("/pool", methods=["GET"])
@login_required
def get_pool_summary():
    """Calculate and return the perk page distribution for the user."""
    service = get_page_streak_service()
    pages = service.build_pages(g.current_user.id)
    return jsonify({
        "pool_size": sum(len(page) for page in pages),
        "page_count": len(pages),
        "perks_per_page": service.get_perks_per_page(),
    }), 200


@page_streak_bp.route("/run/start", methods=["POST"])
@login_required
def start_run():
    """Start a new Page Streak challenge run."""
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer", "").strip() if isinstance(payload.get("killer"), str) else ""
    if not killer:
        return api_error("Field 'killer' is required", 400)

    service = get_page_streak_service()
    try:
        run = service.start_run(g.current_user.id, killer)
    except ValueError as err:
        return api_error(str(err), 400)

    return jsonify({"run": run}), 201


@page_streak_bp.route("/run/result", methods=["POST"])
@login_required
def submit_result():
    """Record match outcome (win/loss) and update current streak state."""
    payload = request.get_json(silent=True) or {}
    killer = payload.get("killer", "").strip() if isinstance(payload.get("killer"), str) else ""
    page = payload.get("page")
    perks = payload.get("perks")
    result = payload.get("result", "").strip().lower() if isinstance(payload.get("result"), str) else ""

    if not killer or not isinstance(page, int) or not isinstance(perks, list) or result not in ("win", "loss"):
        return api_error(
            "Fields 'killer', 'page' (int), 'perks' (list), and 'result' ('win' or 'loss') are required.",
            400,
        )

    service = get_page_streak_service()
    try:
        run = service.submit_result(g.current_user.id, killer, page, perks, result)
    except ValueError as err:
        return api_error(str(err), 400)

    return jsonify({"run": run}), 200


@page_streak_bp.route("/run/reset-all", methods=["POST"])
@login_required
def reset_all_runs():
    """Wipe every killer's Page Streak progress and completion badges."""
    service = get_page_streak_service()
    try:
        service.reset_all(g.current_user.id)
    except ValueError as err:
        return api_error(str(err), 400)

    return jsonify({"success": True}), 200

