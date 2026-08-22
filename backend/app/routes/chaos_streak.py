# backend/app/routes/chaos_streak.py
from flask import Blueprint, current_app, jsonify, request, g
from app.services.chaos.constants import DIFFICULTIES
from app.services.chaos_service import ChaosService
from app.core.security import login_required

chaos_streak_bp = Blueprint("chaos_streak", __name__, url_prefix="/api/v1/chaos-streak")
_default_service = None


def get_chaos_service() -> ChaosService:
    if current_app and current_app.config.get("CHAOS_SERVICE"):
        return current_app.config["CHAOS_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = ChaosService()
    return _default_service


def _clean_difficulty(difficulty):
    if difficulty not in DIFFICULTIES:
        return None
    return difficulty


@chaos_streak_bp.route("/run", methods=["GET"])
@login_required
def get_run():
    difficulty = _clean_difficulty(request.args.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Query parameter 'difficulty' must be one of easy, medium, hell"}), 400
    service = get_chaos_service()
    try:
        run = service.get_or_create_run(g.current_user.id, difficulty)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/reveal", methods=["POST"])
@login_required
def reveal():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    if not run_id:
        return jsonify({"error": "Field 'run_id' is required"}), 400

    service = get_chaos_service()
    try:
        run = service.reveal(g.current_user.id, run_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/result", methods=["POST"])
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

    service = get_chaos_service()
    try:
        run = service.submit_result(g.current_user.id, run_id, result, killer_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/run/reset", methods=["POST"])
@login_required
def reset_run():
    data = request.get_json(silent=True) or {}
    difficulty = _clean_difficulty(data.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Field 'difficulty' must be one of easy, medium, hell"}), 400

    service = get_chaos_service()
    try:
        run = service.reset_run(g.current_user.id, difficulty)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"run": run}), 200


@chaos_streak_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    difficulty = _clean_difficulty(request.args.get("difficulty"))
    if not difficulty:
        return jsonify({"error": "Query parameter 'difficulty' must be one of easy, medium, hell"}), 400
    service = get_chaos_service()
    stats = service.get_stats(g.current_user.id, difficulty)
    return jsonify({"stats": stats}), 200
