# backend/app/routes/synergy.py
from flask import Blueprint, jsonify, request
from app.services.synergy_service import calculate_synergy

synergy_bp = Blueprint("synergy", __name__, url_prefix="/api/v1/synergy")


@synergy_bp.route("/analyze", methods=["POST"])
def analyze_synergy():
    """Calculate loadout synergy score and tags for a list of perks."""
    data = request.get_json(silent=True) or {}
    perk_names = data.get("perks") or data.get("perk_names") or []
    role = data.get("role", "survivor").strip().lower()

    if not isinstance(perk_names, list) or not perk_names:
        return jsonify({"error": "A non-empty list of 'perks' is required.", "status": 400}), 400

    if role not in ("survivor", "killer"):
        role = "survivor"

    result = calculate_synergy(perk_names, role)
    return jsonify(result), 200