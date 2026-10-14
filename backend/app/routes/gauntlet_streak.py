# backend/app/routes/gauntlet_streak.py
from flask import g, jsonify, request
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint, make_value_cleaner
from app.services.gauntlet import GAME_MODES
from app.services.gauntlet_service import GauntletService

from pydantic import ValidationError

from app.schemas.streak import GauntletBoostDTO, GauntletResultDTO, GauntletTargetDTO
from app.utils.responses import api_error

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
    try:
        dto = GauntletResultDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        role_err = any(e["loc"] == ("role",) for e in err.errors())
        if role_err:
            return api_error("Field 'role' must be 'survivor' or 'killer'", 400, details=err.errors())
        return api_error("Fields 'run_id' and 'result' (win/loss) are required", 400, details=err.errors())

    role = _clean_role(dto.role)
    run_id = dto.run_id
    result = dto.result
    use_shield = dto.use_shield

    service = get_gauntlet_service()
    try:
        updated_run = service.submit_result(g.current_user.id, run_id, result, use_shield=use_shield)
        if updated_run.get("status") == "completed":
            return jsonify({"run": updated_run, "previous_run": updated_run}), 200
        next_run = service.prepare_next_match(g.current_user.id, role, game_mode=updated_run["game_mode"])
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return api_error(str(e), status)
    return jsonify({"run": next_run, "previous_run": updated_run}), 200


@gauntlet_streak_bp.route("/target", methods=["POST"])
@login_required
def select_target():
    try:
        dto = GauntletTargetDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Fields 'run_id' and 'character' are required", 400, details=err.errors())

    try:
        run = get_gauntlet_service().select_target(g.current_user.id, dto.run_id, dto.character)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return api_error(str(e), status)
    return jsonify({"run": run}), 200


@gauntlet_streak_bp.route("/boost", methods=["POST"])
@login_required
def buy_boost():
    try:
        dto = GauntletBoostDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        char_err = any(e["loc"] == ("character",) for e in err.errors())
        if char_err:
            return api_error("Field 'character' must be a string", 400, details=err.errors())
        return api_error("Fields 'run_id' and 'boost' (reroll, pick or slot) are required", 400, details=err.errors())

    try:
        run = get_gauntlet_service().buy_boost(g.current_user.id, dto.run_id, dto.boost, dto.character)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return api_error(str(e), status)
    return jsonify({"run": run}), 200


