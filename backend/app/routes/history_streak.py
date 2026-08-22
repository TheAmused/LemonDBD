# backend/app/routes/history_streak.py
from flask import Blueprint, current_app, jsonify, request, g
from app.services.history_service import HistoryService
from app.core.security import login_required

history_streak_bp = Blueprint("history_streak", __name__, url_prefix="/api/v1/history-streak")
_default_service = None

MODES = ("medium", "hell")


def get_history_service() -> HistoryService:
    if current_app and current_app.config.get("HISTORY_SERVICE"):
        return current_app.config["HISTORY_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = HistoryService()
    return _default_service


def _clean_mode(mode):
    return mode if mode in MODES else None


@history_streak_bp.route("/run", methods=["GET"])
@login_required
def get_run():
    mode = _clean_mode(request.args.get("mode"))
    if not mode:
        return jsonify({"error": "Query parameter 'mode' must be one of medium, hell"}), 400
    service = get_history_service()
    try:
        run = service.get_or_create_run(g.current_user.id, mode)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"run": run}), 200


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


@history_streak_bp.route("/run/reset", methods=["POST"])
@login_required
def reset_run():
    data = request.get_json(silent=True) or {}
    mode = _clean_mode(data.get("mode"))
    if not mode:
        return jsonify({"error": "Field 'mode' must be one of medium, hell"}), 400

    service = get_history_service()
    try:
        run = service.reset_run(g.current_user.id, mode)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"run": run}), 200


@history_streak_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    mode = _clean_mode(request.args.get("mode"))
    if not mode:
        return jsonify({"error": "Query parameter 'mode' must be one of medium, hell"}), 400
    service = get_history_service()
    stats = service.get_stats(g.current_user.id, mode)
    return jsonify({"stats": stats}), 200
