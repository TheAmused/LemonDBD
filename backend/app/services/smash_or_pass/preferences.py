"""A signed-in viewer's effects-and-music choice for the Smash or Pass page."""
import time
from typing import Any

from app.core.extensions import db
from app.models.smash_or_pass import SmashUserPreference


def get_preferences(user_id: int) -> dict[str, Any] | None:
    """The account's saved choice, or None when it never made one."""
    row = db.session.get(SmashUserPreference, user_id)
    return row.to_dict() if row else None


def save_preferences(user_id: int, effects: bool, music: bool, chosen_at: int) -> tuple[dict[str, Any], bool]:
    """Stores the choice unless the account already holds a later one.

    Returns the choice the account ends up with and whether it is the one that was sent. A device
    that was offline, or signed out, may send a choice older than what another device saved since;
    that stale one is answered with the newer one instead of overwriting it.
    """
    # A clock set far ahead must not pin the account to a choice nothing can ever replace.
    chosen_at = min(chosen_at, int(time.time() * 1000))
    row = db.session.get(SmashUserPreference, user_id)
    if row and row.chosen_at > chosen_at:
        return row.to_dict(), False
    if row is None:
        row = SmashUserPreference(user_id=user_id)
        db.session.add(row)
    row.effects_enabled = effects
    row.music_enabled = music
    row.chosen_at = chosen_at
    db.session.commit()
    return row.to_dict(), True
