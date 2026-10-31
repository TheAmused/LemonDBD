"""A signed-in viewer's effects, sound-effects and music choice for the Smash or Pass page."""

import time
from typing import Any

from app.core.extensions import db
from app.models.smash_or_pass import SmashUserPreference
from app.models.user_preference import DEFAULT_BACKGROUND_ANIMATION, UserPreference


def get_preferences(user_id: int) -> dict[str, Any] | None:
    """The account's saved choice, or None when it never made one."""
    row = db.session.get(SmashUserPreference, user_id)
    if row:
        return row.to_dict()
    user_pref = db.session.get(UserPreference, user_id)
    if user_pref:
        return {
            "effects": user_pref.effects_enabled,
            "sounds": user_pref.sounds_enabled,
            "music": user_pref.music_enabled,
            "chosen_at": user_pref.chosen_at,
        }
    return None


def save_preferences(
    user_id: int, effects: bool, sounds: bool, music: bool, chosen_at: int
) -> tuple[dict[str, Any], bool]:
    """Stores the choice unless the account already holds a later one.

    Returns the choice the account ends up with and whether it is the one that was sent. A device
    that was offline, or signed out, may send a choice older than what another device saved since;
    that stale one is answered with the newer one instead of overwriting it.
    """
    # A clock set far ahead must not pin the account to a choice nothing can ever replace.
    chosen_at = min(chosen_at, int(time.time() * 1000))
    row = db.session.get(SmashUserPreference, user_id)
    user_pref = db.session.get(UserPreference, user_id)
    latest_chosen_at = max(
        row.chosen_at if row else -1,
        user_pref.chosen_at if (user_pref and user_pref.chosen_at is not None) else -1,
    )
    if latest_chosen_at > chosen_at:
        return get_preferences(user_id) or (row.to_dict() if row else {}), False

    if row is None:
        row = SmashUserPreference(user_id=user_id)
        db.session.add(row)
    row.effects_enabled = effects
    row.sounds_enabled = sounds
    row.music_enabled = music
    row.chosen_at = chosen_at

    # Keep UserPreference in sync
    if user_pref is None:
        user_pref = UserPreference(
            user_id=user_id,
            effects_enabled=effects,
            sounds_enabled=sounds,
            music_enabled=music,
            nsfw_enabled=False,
            background_animation=DEFAULT_BACKGROUND_ANIMATION,
            chosen_at=chosen_at,
        )
        db.session.add(user_pref)
    else:
        user_pref.effects_enabled = effects
        user_pref.sounds_enabled = sounds
        user_pref.music_enabled = music
        user_pref.chosen_at = chosen_at

    db.session.commit()
    return row.to_dict(), True
