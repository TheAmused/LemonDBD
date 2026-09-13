# backend/app/services/roster_milestone.py
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import Killer, Survivor
from app.models.base import utcnow

_ROLE_MODELS = {"Killer": Killer, "Survivor": Survivor}


def get_full_roster_milestone(
    owned_character_ids: list[int], role: str, roster_limit: int | None = None
) -> tuple[bool, int]:
    """Decide whether clearing every owned character in `owned_character_ids`
    also clears the whole game (bounded by `roster_limit` when the challenge
    itself caps its roster, e.g. Gauntlet's "Original" mode).

    Matches on id, not name, so a later rename can't silently break the
    lookup. The cutoff is the newest `created_at` among the player's own
    owned characters -- not "now" -- so a character added in after that
    roster was fixed (BHVR shipping new content mid-grind) never demotes an
    otherwise earned full-roster trophy: it simply wasn't part of the game
    yet as far as this roster is concerned.

    Returns (is_full, game_total).
    """
    if not owned_character_ids:
        return False, 0

    model = _ROLE_MODELS[role]

    owned_timestamps = db.session.scalars(
        select(model.created_at).where(
            model.is_disabled.is_(False),
            model.id.in_(owned_character_ids),
        )
    ).all()
    cutoff = max(owned_timestamps) if owned_timestamps else utcnow()

    game_total_stmt = select(func.count()).select_from(model).where(
        model.is_disabled.is_(False),
        model.created_at <= cutoff,
    )
    if roster_limit is not None:
        # `release_number` is derived (== id) now, not a queryable column.
        game_total_stmt = game_total_stmt.where(model.id <= roster_limit)
    game_total = db.session.scalar(game_total_stmt) or 0

    return game_total == len(owned_character_ids), game_total
