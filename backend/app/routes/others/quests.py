# backend/app/routes/others/quests.py
from flask import Blueprint, current_app, jsonify, request
from app.services.others.quest_service import QuestService

quests_bp = Blueprint("quests", __name__, url_prefix="/api/v1/quests")
_default_quest_service = None


def get_quest_service() -> QuestService:
    if current_app and current_app.config.get("QUEST_SERVICE"):
        return current_app.config["QUEST_SERVICE"]
    global _default_quest_service
    if _default_quest_service is None:
        _default_quest_service = QuestService()
    return _default_quest_service


@quests_bp.route("/", methods=["GET"])
def get_active_quests():
    service = get_quest_service()
    quests = service.get_quests()
    return jsonify({"status": "success", "quests": quests}), 200


@quests_bp.route("/claim", methods=["POST"])
def claim_quest():
    data = request.get_json(silent=True) or {}
    quest_id = data.get("quest_id") or data.get("id")
    if quest_id is None:
        return jsonify({"error": "Missing 'quest_id' parameter."}), 400

    service = get_quest_service()
    try:
        res = service.claim_quest(quest_id)
        return jsonify({"status": "success", **res}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
