# backend/app/routes/user_preferences.py
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.security import login_required
from app.schemas.user_preference import UserPreferenceIn
from app.services.user.preferences import get_user_preferences, save_user_preferences

user_preferences_bp = Blueprint("user_preferences", __name__, url_prefix="/api/v1/user/preferences")


@user_preferences_bp.route("", methods=["GET"])
@login_required
def read_preferences():
    return jsonify({"data": get_user_preferences(g.current_user.id)}), 200


@user_preferences_bp.route("", methods=["PUT"])
@login_required
def write_preferences():
    raw_body = request.get_json(silent=True)
    try:
        payload = UserPreferenceIn.model_validate({} if raw_body is None else raw_body)
    except ValidationError as err:
        return jsonify(
            {"error": "Invalid preferences", "details": err.errors(include_url=False, include_context=False)}
        ), 400

    data = save_user_preferences(
        user_id=g.current_user.id,
        effects=payload.effects,
        sounds=payload.sounds,
        music=payload.music,
        nsfw=payload.nsfw,
        background_animation=payload.background_animation,
        chosen_at=payload.chosen_at,
    )
    return jsonify({"data": data}), 200
