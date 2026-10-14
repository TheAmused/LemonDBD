# backend/app/routes/synergy.py
from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.schemas.synergy import SynergyAnalyzeDTO
from app.services.synergy_service import calculate_synergy
from app.utils.responses import api_error

synergy_bp = Blueprint("synergy", __name__, url_prefix="/api/v1/synergy")


@synergy_bp.route("/analyze", methods=["POST"])
def analyze_synergy():
    """Calculate loadout synergy score and tags for a list of perks."""
    try:
        dto = SynergyAnalyzeDTO.model_validate(request.get_json(silent=True) or {})
    except ValidationError as err:
        return api_error("A non-empty list of 'perks' is required.", 400, details=err.errors())

    perk_names = dto.perks or dto.perk_names or []
    if not isinstance(perk_names, list) or not perk_names:
        return api_error("A non-empty list of 'perks' is required.", 400)

    role = dto.role.strip().lower()
    if role not in ("survivor", "killer"):
        role = "survivor"

    result = calculate_synergy(perk_names, role)
    return jsonify(result), 200

