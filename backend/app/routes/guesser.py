from flask import Blueprint, jsonify, request
from app.services.guesser_service import GuesserService

guesser_bp = Blueprint("guesser", __name__, url_prefix="/api/v1/guesser")
guesser_service = GuesserService()

@guesser_bp.route("/stats", methods=["GET"])
def get_stats():
    try:
        stats = guesser_service.get_all_stats()
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@guesser_bp.route("/stats", methods=["POST"])
def post_result():
    payload = request.get_json(silent=True) or {}
    guesser_type = payload.get("guesser_type")
    is_correct = payload.get("is_correct")
    
    if guesser_type is None or is_correct is None:
        return jsonify({"error": "Fields 'guesser_type' and 'is_correct' are required"}), 400
        
    valid_types = {"character", "perk_description", "perk_name_to_icon", "perk_icon_to_name", "memes"}
    if guesser_type not in valid_types:
        return jsonify({"error": f"Invalid guesser_type: {guesser_type}"}), 400
        
    try:
        updated = guesser_service.update_stats(guesser_type, bool(is_correct))
        return jsonify({"data": updated}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@guesser_bp.route("/reset", methods=["POST"])
def reset_streak():
    payload = request.get_json(silent=True) or {}
    guesser_type = payload.get("guesser_type")
    
    if not guesser_type:
        return jsonify({"error": "Field 'guesser_type' is required"}), 400
        
    valid_types = {"character", "perk_description", "perk_name_to_icon", "perk_icon_to_name", "memes"}
    if guesser_type not in valid_types:
        return jsonify({"error": f"Invalid guesser_type: {guesser_type}"}), 400
        
    try:
        updated = guesser_service.reset_streak(guesser_type)
        return jsonify({"data": updated}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
