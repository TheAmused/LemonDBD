# backend/app/routes/admin_maintenance_mode.py
"""Admin: switch maintenance mode on or off, now or on a schedule."""
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.security import admin_required
from app.schemas.admin import UpdateMaintenanceModeDTO
from app.services import maintenance_mode
from app.services.admin_control_service import log_admin_action
from app.utils.responses import api_error

admin_maintenance_mode_bp = Blueprint("admin_maintenance_mode", __name__, url_prefix="/api/v1/admin/maintenance-mode")

TARGET = "maintenance_mode"


@admin_maintenance_mode_bp.route("", methods=["GET"])
@admin_required
def get_state():
    return jsonify(maintenance_mode.current_state().as_dict()), 200


@admin_maintenance_mode_bp.route("", methods=["PUT"])
@admin_required
def update_state():
    """Body: ``{"enabled": bool, "starts_at": iso | null, "until": iso | null}``."""
    try:
        dto = UpdateMaintenanceModeDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("Field 'enabled' (true or false) is required.", 400, details=err.errors())
    try:
        state = maintenance_mode.save_window(enabled=dto.enabled, starts_at=dto.starts_at, until=dto.until)
    except ValueError as err:
        return api_error(str(err), 400)
    log_admin_action(g.current_user.id, action="maintenance_mode_updated", target_type=TARGET, details=state.as_dict())
    return jsonify(state.as_dict()), 200
