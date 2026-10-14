# backend/app/routes/chaos_streak.py
from flask import g, jsonify, request
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint, make_value_cleaner
from app.services.chaos.constants import DIFFICULTIES
from app.services.chaos_service import ChaosService

from pydantic import ValidationError

from app.schemas.streak import StreakResultDTO
from app.utils.responses import api_error

get_chaos_service = make_service_getter("CHAOS_SERVICE", ChaosService)
_clean_difficulty = make_value_cleaner(DIFFICULTIES)

chaos_streak_bp = make_streak_blueprint(
    name="chaos_streak",
    url_prefix="/api/v1/chaos-streak",
    get_service=get_chaos_service,
    param_name="difficulty",
    valid_values=DIFFICULTIES,
    invalid_value_hint="one of easy, medium, hell",
)


@chaos_streak_bp.route("/result", methods=["POST"])
@login_required
def submit_result():
    try:
        dto = StreakResultDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        killer_err = any(e["loc"] == ("killer_id",) for e in err.errors())
        if killer_err and not any(e["loc"] in (("run_id",), ("result",)) for e in err.errors()):
            return api_error("Field 'killer_id' is required", 400, details=err.errors())
        return api_error("Fields 'run_id' and 'result' (win/loss) are required", 400, details=err.errors())

    service = get_chaos_service()
    try:
        run = service.submit_result(g.current_user.id, dto.run_id, dto.result, dto.killer_id)
    except ValueError as e:
        status = 404 if "not found" in str(e).lower() else 400
        return api_error(str(e), status)
    return jsonify({"run": run}), 200

