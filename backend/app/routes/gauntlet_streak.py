# backend/app/routes/gauntlet_streak.py
from flask import g, jsonify, request
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint, make_value_cleaner
from app.services.gauntlet import GAME_MODES
from app.services.gauntlet_service import GauntletService

get_gauntlet_service = make_service_getter("GAUNTLET_SERVICE", GauntletService)
_clean_role = make_value_cleaner(("survivor", "killer"))

gauntlet_streak_bp = make_streak_blueprint(
    name="gauntlet_streak",
    url_prefix="/api/v1/gauntlet-streak",
    get_service=get_gauntlet_service,
    param_name="role",
    valid_values=("survivor", "killer"),
    invalid_value_hint="'survivor' or 'killer'",
    reveal_method="reveal_target",
    game_modes=GAME_MODES,
)


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
        if updated_run.get("status") == "completed":
            return jsonify({"run": updated_run, "previous_run": updated_run}), 200
        next_run = service.prepare_next_match(g.current_user.id, role, game_mode=updated_run["game_mode"])
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": next_run, "previous_run": updated_run}), 200


@gauntlet_streak_bp.route("/target", methods=["POST"])
@login_required
def select_target():
    data = request.get_json(silent=True) or {}
    run_id = data.get("run_id")
    character = data.get("character")
    if not run_id or not isinstance(character, str) or not character:
        return jsonify({"error": "Fields 'run_id' and 'character' are required"}), 400

    try:
        run = get_gauntlet_service().select_target(g.current_user.id, run_id, character)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return jsonify({"error": str(e)}), status
    return jsonify({"run": run}), 200
