# backend/app/services/user/preferences.py
import time
from typing import Any

from app.core.extensions import db
from app.models.smash_or_pass import SmashUserPreference
from app.models.user_preference import UserPreference


def get_user_preferences(user_id: int) -> dict[str, Any] | None:
    """The account's saved choice, falling back to smash preferences if present."""
    row = db.session.get(UserPreference, user_id)
    if row:
        return row.to_dict()
    # Fallback to smash preferences if user had older saved prefs
    smash_row = db.session.get(SmashUserPreference, user_id)
    if smash_row:
        return {
            "effects": smash_row.effects_enabled,
            "sounds": smash_row.sounds_enabled,
            "music": smash_row.music_enabled,
            "nsfw": False,
            "background_animation": "on",
            "chosen_at": smash_row.chosen_at,
        }
    return None


def save_user_preferences(
    user_id: int,
    effects: bool,
    sounds: bool,
    music: bool,
    nsfw: bool,
    background_animation: str,
    chosen_at: int,
) -> dict[str, Any]:
    """Stores the preferences unless the account already holds a newer choice.

    Dual-writes to SmashUserPreference for backward compatibility.
    """
    chosen_at = min(chosen_at, int(time.time() * 1000))
    row = db.session.get(UserPreference, user_id)
    smash_row = db.session.get(SmashUserPreference, user_id)
    latest_chosen_at = max(
        row.chosen_at if row else -1,
        smash_row.chosen_at if (smash_row and smash_row.chosen_at is not None) else -1,
    )
    if latest_chosen_at > chosen_at:
        return get_user_preferences(user_id) or (row.to_dict() if row else {})

    if row is None:
        row = UserPreference(user_id=user_id)
        db.session.add(row)
    row.effects_enabled = effects
    row.sounds_enabled = sounds
    row.music_enabled = music
    row.nsfw_enabled = nsfw
    row.background_animation = background_animation
    row.chosen_at = chosen_at

    # Dual-write to smash_user_preferences to maintain legacy backward compatibility
    if smash_row is None:
        smash_row = SmashUserPreference(user_id=user_id)
        db.session.add(smash_row)
    smash_row.effects_enabled = effects
    smash_row.sounds_enabled = sounds
    smash_row.music_enabled = music
    smash_row.chosen_at = chosen_at

    db.session.commit()
    return row.to_dict()
