# backend/app/routes/history_streak.py
from flask import g, jsonify, request
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint
from app.services.history_service import HistoryService

MODES = ("medium", "hell")

get_history_service = make_service_getter("HISTORY_SERVICE", HistoryService)

history_streak_bp = make_streak_blueprint(
    name="history_streak",
    url_prefix="/api/v1/history-streak",
    get_service=get_history_service,
    param_name="mode",
    valid_values=MODES,
    invalid_value_hint="one of medium, hell",
    has_reveal=False,
)


@history_streak_bp.route("/result", methods=["POST"])
@login_required
def submit_result():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    result = data.get("result")
    killer_id = data.get("killer_id")
    if not run_id or result not in ("win", "loss"):
        return jsonify({"error": "Fields 'run_id' and 'result' (win/loss) are required"}), 400
    if not killer_id:
        return jsonify({"error": "Field 'killer_id' is required"}), 400

    service = get_history_service()
    try:
        run = service.submit_result(g.current_user.id, run_id, result, killer_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200
