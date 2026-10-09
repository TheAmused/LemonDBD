# backend/app/routes/smash_or_pass_preferences.py
from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.core.security import login_required
from app.schemas.smash_or_pass import SmashPreferenceIn
from app.services.smash_or_pass.preferences import get_preferences, save_preferences

smash_preferences_bp = Blueprint(
    "smash_or_pass_preferences", __name__, url_prefix="/api/v1/smash-or-pass/preferences"
)


@smash_preferences_bp.route("", methods=["GET"])
@login_required
def read_preferences():
    """The account's effects-and-music choice; `data` is null until it has made one."""
    return jsonify({"data": get_preferences(g.current_user.id)}), 200


@smash_preferences_bp.route("", methods=["PUT"])
@login_required
def write_preferences():
    """Saves the choice unless the account already holds a later one (`applied` says which won)."""
    try:
        payload = SmashPreferenceIn(**(request.get_json(silent=True) or {}))
    except ValidationError as err:
        return jsonify({"error": "Invalid preferences", "details": err.errors(include_url=False, include_context=False)}), 400
    sounds = payload.effects if payload.sounds is None else payload.sounds
    data, applied = save_preferences(g.current_user.id, payload.effects, sounds, payload.music, payload.chosen_at)
    return jsonify({"data": data, "applied": applied}), 200
