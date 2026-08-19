# backend/app/routes/others/draft.py
from flask import Blueprint, current_app, jsonify, request
from app.services.others.draft_service import DraftService

draft_bp = Blueprint("draft", __name__, url_prefix="/api/v1/draft")
_default_draft_service = None


def get_draft_service() -> DraftService:
    if current_app and current_app.config.get("DRAFT_SERVICE"):
        return current_app.config["DRAFT_SERVICE"]
    global _default_draft_service
    if _default_draft_service is None:
        _default_draft_service = DraftService()
    return _default_draft_service


@draft_bp.route("/create", methods=["POST"])
def create_draft():
    data = request.get_json(silent=True) or {}
    room_code = data.get("room_code")
    service = get_draft_service()
    room = service.create_room(room_code=room_code)
    return jsonify({"status": "success", "room": room}), 201


@draft_bp.route("/<room_code>", methods=["GET"])
def get_draft(room_code):
    service = get_draft_service()
    room = service.get_room(room_code)
    if not room:
        return jsonify({"error": f"Draft room '{room_code}' not found."}), 404
    return jsonify({"status": "success", "room": room}), 200


@draft_bp.route("/<room_code>/action", methods=["POST"])
def process_draft_action(room_code):
    data = request.get_json(silent=True) or {}
    service = get_draft_service()
    try:
        updated_room = service.process_action(room_code, data)
        return jsonify({"status": "success", "room": updated_room}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
