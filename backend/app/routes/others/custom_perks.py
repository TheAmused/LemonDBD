# backend/app/routes/others/custom_perks.py
from flask import Blueprint, request, jsonify
from app.services.others.custom_perk_service import CustomPerkService

custom_perks_bp = Blueprint("custom_perks", __name__, url_prefix="/api/v1/custom-perks")
service = CustomPerkService()


@custom_perks_bp.route("/", methods=["GET"], strict_slashes=False)
def list_custom_perks():
    role = request.args.get("role")
    rarity = request.args.get("rarity")
    search = request.args.get("search")
    sort_by = request.args.get("sort_by", "newest")

    perks = service.get_custom_perks(
        role=role,
        rarity=rarity,
        search=search,
        sort_by=sort_by
    )
    return jsonify({
        "custom_perks": perks,
        "total": len(perks)
    }), 200


@custom_perks_bp.route("/", methods=["POST"], strict_slashes=False)
def create_custom_perk():
    data = request.get_json() or {}

    name = data.get("name")
    description = data.get("description")

    if not name or not str(name).strip():
        return jsonify({"error": "Perk name is required"}), 400

    if not description or not str(description).strip():
        return jsonify({"error": "Perk description is required"}), 400

    role = data.get("role", "survivor")
    character_name = data.get("character_name", "Teachable")
    rarity = data.get("rarity", "Very Rare")
    icon_preset = data.get("icon_preset", "sparkles")
    author = data.get("author", "Community")

    perk = service.create_custom_perk(
        name=name,
        role=role,
        character_name=character_name,
        rarity=rarity,
        icon_preset=icon_preset,
        description=description,
        author=author
    )

    return jsonify({
        "custom_perk": perk,
        "message": "Custom perk concept created successfully"
    }), 201


@custom_perks_bp.route("/<int:perk_id>/upvote", methods=["POST"], strict_slashes=False)
def upvote_custom_perk(perk_id: int):
    perk = service.upvote_custom_perk(perk_id)
    if not perk:
        return jsonify({"error": "Custom perk concept not found"}), 404

    return jsonify({
        "custom_perk": perk,
        "message": "Upvoted successfully"
    }), 200
