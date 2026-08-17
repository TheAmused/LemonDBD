from flask import Blueprint, request, jsonify
from app.services.others.killer_calc_service import KillerCalcService

killer_calc_bp = Blueprint("killer_calc", __name__, url_prefix="/api/v1/killer-calc")
calc_service = KillerCalcService()


@killer_calc_bp.route("/data", methods=["GET"])
def get_killer_calc_data():
    """Return all available killers, power stats, add-ons, and perks for the calculator."""
    return jsonify({
        "status": "success",
        "killers": calc_service.get_killers(),
        "perks": calc_service.get_perks()
    }), 200


@killer_calc_bp.route("/calculate", methods=["POST"])
def calculate():
    """Calculate exact stat deltas and modified terror radius for given killer, add-ons, and perks."""
    data = request.get_json() or {}

    killer_id = data.get("killer_id", "huntress")
    addon_ids = data.get("addon_ids", [])
    perk_ids = data.get("perk_ids", [])
    perk_options = data.get("perk_options", {})

    try:
        result = calc_service.calculate(
            killer_id=killer_id,
            addon_ids=addon_ids,
            perk_ids=perk_ids,
            perk_options=perk_options
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to calculate stats", "details": str(e)}), 500
