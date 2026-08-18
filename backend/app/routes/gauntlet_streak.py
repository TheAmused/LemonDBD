from flask import Blueprint, current_app, jsonify, request, g
from app.services.gauntlet_service import GauntletService
from app.utils.auth_helper import login_required

gauntlet_streak_bp = Blueprint("gauntlet_streak", __name__, url_prefix="/api/v1/gauntlet-streak")
_default_service = None


def get_gauntlet_service() -> GauntletService:
    if current_app and current_app.config.get("GAUNTLET_SERVICE"):
        return current_app.config["GAUNTLET_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = GauntletService()
    return _default_service


def _clean_role(role):
    if role not in ("survivor", "killer"):
        return None
    return role


@gauntlet_streak_bp.route("/run", methods=["GET"])
@login_required
def get_run():
    role = _clean_role(request.args.get("role"))
    if not role:
        return jsonify({"error": "Query parameter 'role' must be 'survivor' or 'killer'"}), 400
    service = get_gauntlet_service()
    run = service.get_or_create_run(g.current_user.id, role)
    return jsonify({"run": run}), 200


@gauntlet_streak_bp.route("/result", methods=["POST"])
@login_required
def submit_result():
    data = request.get_json(silent=True) or {}
    role = _clean_role(data.get("role"))
    run_id = data.get("run_id")
    result = data.get("result")
    if not role:
        return jsonify({"error": "Field 'role' must be 'survivor' or 'killer'"}), 400
    if not run_id or result not in ("win", "loss"):
        return jsonify({"error": "Fields 'run_id' and 'result' (win/loss) are required"}), 400

    service = get_gauntlet_service()
    try:
        updated_run = service.submit_result(g.current_user.id, run_id, result)
        # A won gauntlet has no next target to draw — leave the completed run standing.
        if updated_run.get("status") == "completed":
            return jsonify({"run": updated_run, "previous_run": updated_run}), 200
        rolled_run = service.roll(g.current_user.id, role)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": rolled_run, "previous_run": updated_run}), 200


@gauntlet_streak_bp.route("/reveal", methods=["POST"])
@login_required
def reveal():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    if not run_id:
        return jsonify({"error": "Field 'run_id' is required"}), 400

    service = get_gauntlet_service()
    try:
        run = service.reveal_target(g.current_user.id, run_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200


@gauntlet_streak_bp.route("/run/reset", methods=["POST"])
@login_required
def reset_run():
    data = request.get_json(silent=True) or {}
    role = _clean_role(data.get("role"))
    if not role:
        return jsonify({"error": "Field 'role' must be 'survivor' or 'killer'"}), 400

    service = get_gauntlet_service()
    try:
        run = service.reset_run(g.current_user.id, role)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"run": run}), 200


@gauntlet_streak_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    role = _clean_role(request.args.get("role"))
    if not role:
        return jsonify({"error": "Query parameter 'role' must be 'survivor' or 'killer'"}), 400
    service = get_gauntlet_service()
    stats = service.get_stats(g.current_user.id, role)
    return jsonify({"stats": stats}), 200
