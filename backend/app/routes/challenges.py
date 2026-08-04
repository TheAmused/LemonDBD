from flask import Blueprint, current_app, jsonify, request
from app.services.challenge_service import ChallengeService

challenges_bp = Blueprint("challenges", __name__, url_prefix="/api/v1/challenges")
_default_service = None


def get_challenge_service() -> ChallengeService:
    if current_app and current_app.config.get("CHALLENGE_SERVICE"):
        return current_app.config["CHALLENGE_SERVICE"]
    global _default_service
    if _default_service is None:
        _default_service = ChallengeService()
    return _default_service


@challenges_bp.route("/run", methods=["GET"])
def get_challenge_run():
    service = get_challenge_service()
    settings = service.get_user_settings()
    role = request.args.get("role") or settings.get("active_role", "survivor")
    if role not in ("survivor", "killer"):
        role = settings.get("active_role", "survivor")

    run = service.get_or_create_run(role)
    return jsonify({"run": run, "settings": settings}), 200


@challenges_bp.route("/roll", methods=["POST"])
def roll_challenge():
    data = request.get_json(silent=True) or {}
    service = get_challenge_service()
    settings = service.get_user_settings()

    role = data.get("role") or request.args.get("role") or settings.get("active_role", "survivor")
    if role not in ("survivor", "killer"):
        role = settings.get("active_role", "survivor")

    rolled_run = service.roll_challenge(role)
    return jsonify({"run": rolled_run, "settings": settings}), 200


@challenges_bp.route("/result", methods=["POST"])
def submit_match_result():
    data = request.get_json(silent=True) or {}
    result = data.get("result")
    if not result or result not in ("win", "loss"):
        return jsonify({"error": "Invalid or missing 'result'. Must be 'win' or 'loss'."}), 400

    service = get_challenge_service()
    settings = service.get_user_settings()
    role = data.get("role") or settings.get("active_role", "survivor")

    run_id = data.get("run_id")
    if run_id is None:
        active_run = service.get_or_create_run(role)
        run_id = active_run["id"]

    try:
        updated_run = service.submit_result(run_id, result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    rolled_run = service.roll_challenge(updated_run["role"])
    return jsonify({"run": rolled_run, "previous_run": updated_run, "settings": settings}), 200


@challenges_bp.route("/settings", methods=["GET", "POST"])
def handle_settings():
    service = get_challenge_service()

    if request.method == "GET":
        settings = service.get_user_settings()
        return jsonify({"settings": settings}), 200

    data = request.get_json(silent=True) or {}
    active_role = data.get("active_role")
    checkpoint_interval = data.get("checkpoint_interval")

    if active_role is not None and active_role not in ("survivor", "killer"):
        return jsonify({"error": "Invalid active_role. Must be 'survivor' or 'killer'."}), 400

    if checkpoint_interval is not None:
        try:
            checkpoint_interval = int(checkpoint_interval)
            if checkpoint_interval < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"error": "checkpoint_interval must be a non-negative integer."}), 400

    updated_settings = service.update_user_settings(
        active_role=active_role, checkpoint_interval=checkpoint_interval
    )
    return jsonify({"settings": updated_settings}), 200


@challenges_bp.route("/stats", methods=["GET"])
def get_stats():
    service = get_challenge_service()
    stats = service.get_stats()
    return jsonify({"stats": stats}), 200
