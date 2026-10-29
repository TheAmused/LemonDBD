# backend/app/routes/id_please_streak.py
"""The ID, Please endpoints, one blueprint per lane (mixed, survivor, killer) so each has its own service and kill switch."""
from functools import partial

from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.limiter import limiter
from app.core.security import login_required
from app.core.service_registry import make_service_getter
from app.core.streak_blueprint import make_streak_blueprint
from app.schemas.id_please import IdPleaseOpeningDTO, IdPleaseResultDTO
from app.services.id_please.constants import DIFFICULTIES, LANES
from app.services.id_please_service import IdPleaseConflict, IdPleaseService
from app.utils.responses import api_error

#: URL prefix per lane. The mixed lane keeps the original one.
URL_PREFIX = {
    "mixed": "/api/v1/id-please-streak",
    "survivor": "/api/v1/id-please-survivor-streak",
    "killer": "/api/v1/id-please-killer-streak",
}


def _failure(err: ValueError):
    if isinstance(err, IdPleaseConflict):
        return api_error(str(err), 409, code=err.code, **err.details)
    status = 404 if "not found" in str(err).lower() else 400
    return api_error(str(err), status)


def _build_blueprint(lane: str) -> tuple[Blueprint, object]:
    get_service = make_service_getter(f"ID_PLEASE_{lane.upper()}_SERVICE", partial(IdPleaseService, lane))
    name = "id_please_streak" if lane == "mixed" else f"id_please_{lane}_streak"
    bp = make_streak_blueprint(
        name=name,
        url_prefix=URL_PREFIX[lane],
        get_service=get_service,
        param_name="difficulty",
        valid_values=DIFFICULTIES,
        invalid_value_hint="one of milestones, hardcore, hardcore_plus",
        has_reveal=False,
    )

    @bp.route("/eligibility", methods=["GET"])
    @login_required
    def get_eligibility():
        return jsonify(get_service().get_eligibility(g.current_user.id)), 200

    @bp.route("/roster", methods=["GET"])
    @limiter.limit("60 per minute")
    @login_required
    def get_roster():
        try:
            roster = get_service().get_roster(g.current_user.id, request.args.get("side", ""))
        except ValueError as err:
            return _failure(err)
        return jsonify({"roster": roster}), 200

    @bp.route("/preview", methods=["GET"])
    @limiter.limit("60 per minute")
    @login_required
    def get_preview():
        raw = [part for part in request.args.get("perks", "").split(",") if part != ""]
        try:
            positions = [int(part) for part in raw]
            preview = get_service().preview(
                g.current_user.id, request.args.get("side", ""), positions, request.args.get("difficulty") or "milestones"
            )
        except ValueError as err:
            return _failure(err)
        return jsonify({"preview": preview}), 200

    @bp.route("/opening", methods=["POST"])
    @login_required
    def submit_opening():
        try:
            dto = IdPleaseOpeningDTO.model_validate(request.get_json(silent=True) or {})
        except ValidationError as err:
            return api_error("Fields 'run_id', 'side' and 'perk_positions' are required", 400, details=err.errors(include_url=False, include_context=False))
        try:
            run = get_service().submit_opening(g.current_user.id, dto.run_id, dto.side, dto.perk_positions, dto.roster_fingerprint)
        except ValueError as err:
            return _failure(err)
        return jsonify({"run": run}), 200

    @bp.route("/result", methods=["POST"])
    @login_required
    def submit_result():
        try:
            dto = IdPleaseResultDTO.model_validate(request.get_json(silent=True) or {})
        except ValidationError as err:
            return api_error("Fields 'run_id', 'match_number' and 'result' (win/loss) are required", 400, details=err.errors(include_url=False, include_context=False))
        try:
            run = get_service().submit_result(g.current_user.id, dto.run_id, dto.match_number, dto.result, dto.roster_fingerprint)
        except ValueError as err:
            return _failure(err)
        return jsonify({"run": run}), 200

    return bp, get_service


_BUILT = {lane: _build_blueprint(lane) for lane in LANES}
id_please_streak_bp = _BUILT["mixed"][0]
id_please_survivor_streak_bp = _BUILT["survivor"][0]
id_please_killer_streak_bp = _BUILT["killer"][0]
get_id_please_service = _BUILT["mixed"][1]
