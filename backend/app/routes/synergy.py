from flask import Blueprint, jsonify, request
from app.services.synergy_service import calculate_synergy, SynergyService

synergy_bp = Blueprint("synergy", __name__, url_prefix="/api/v1/synergy")


@synergy_bp.route("/analyze", methods=["POST"])
def analyze_synergy():
    data = request.get_json(silent=True) or {}
    perk_names = data.get("perks") or data.get("perk_names") or []
    role = data.get("role", "survivor")

    result = calculate_synergy(perk_names, role)
    return jsonify(result), 200
