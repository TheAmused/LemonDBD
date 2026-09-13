# backend/app/services/page_streak/roster.py
from collections.abc import Callable
from typing import Any
from sqlalchemy import func, select

from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models import Character, PageStreakRun
from app.services.challenge_completions import fetch_completed_variants
from app.services.ownership_service import OwnershipService
from app.services.perk_service import PerkService

# Synthetic variant name for the mode-wide "every owned killer cleared"
# badge -- never stored, only ever synthesized by get_live_roster_badge into
# the same completions/full_roster shape gauntlet/chaos/history use, so the
# hub card and its `/challenge-completions/status` consumer don't need to
# know Page Streak works differently under the hood.
ROSTER_COMPLETE_VARIANT = "roster_complete"


def get_character_release_numbers(perk_service: PerkService) -> dict[str, int]:
    """Retrieve canonical character release order numbers."""
    get_characters = getattr(perk_service, "get_characters", None)
    if not callable(get_characters):
        return {}
    try:
        characters = get_characters() or []
    except Exception:
        return {}

    numbers: dict[str, int] = {}
    for character in characters:
        name = (character or {}).get("name")
        release_number = (character or {}).get("release_number")
        if name and isinstance(release_number, int) and name not in numbers:
            numbers[name] = release_number
    return numbers


def get_owned_killers_ordered(user_id: int, perk_service: PerkService, ownership_service: OwnershipService) -> list[str]:
    """Retrieve owned killer names sorted by release sequence."""
    owned_characters = ownership_service.get_user_characters(user_id, role="Killer")
    owned_names = {c["name"] for c in owned_characters if c["is_owned"] and not c.get("is_disabled")}
    release_numbers = get_character_release_numbers(perk_service)

    def sort_key(name: str):
        position = release_numbers.get(name)
        if position is None:
            return (1, 0, name)
        return (0, position, name)

    return sorted(owned_names, key=sort_key)


def get_killer_avatar_map(user_id: int, ownership_service: OwnershipService) -> dict[str, str]:
    """Name -> avatar_local_path for the user's owned killers."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return {c["name"]: c["avatar_local_path"] for c in owned if c["is_owned"] and c.get("avatar_local_path")}


def get_owned_killer_ids(user_id: int, ownership_service: OwnershipService) -> dict[str, int]:
    """Name -> Character.id for the user's owned, non-disabled killers.

    Keyed by name (to line up with how individual page-streak completions
    are recorded); the id is kept alongside it so a killer rename can't
    silently break identity elsewhere, the same stable-id convention
    `app.services.roster_milestone.get_full_roster_milestone` uses for the
    other three modes -- Page Streak's own live badge just doesn't need it,
    since it only counts owned killers here.
    """
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return {c["name"]: c["id"] for c in owned if c["is_owned"] and not c.get("is_disabled")}


def get_live_roster_badge(
    user_id: int,
    ownership_service: OwnershipService,
    completed_killers: set[str] | None = None,
) -> dict[str, Any]:
    """Live "have you cleared literally everyone you currently own" check.

    Unlike gauntlet/chaos/history, Page Streak has no bounded run to freeze
    a pool against -- the roster keeps growing as characters are unlocked
    (by the player, or by a brand new one defaulting to owned), so this is
    recomputed fresh on every read instead of ever being stored as a
    permanent completion record. Losing ownership of a killer, or a new one
    joining the roster, can make this un-true again -- that is correct here,
    not a bug: the badge is a live status, not a historical claim.

    `completed_killers` lets a caller that already fetched this user's
    page_streak completions pass it in instead of this querying it again.
    """
    owned_ids = get_owned_killer_ids(user_id, ownership_service)
    if not owned_ids:
        return {"completed": False, "full_roster": False, "killer_count": None}

    if completed_killers is None:
        completed_killers = fetch_completed_variants(user_id, "page_streak")
    if not all(name in completed_killers for name in owned_ids):
        return {"completed": False, "full_roster": False, "killer_count": None}

    game_total = db.session.scalar(
        select(func.count()).select_from(Character).where(
            Character.role == "Killer",
            Character.is_disabled.is_(False),
        )
    ) or 0
    owned_count = len(owned_ids)
    return {"completed": True, "full_roster": owned_count == game_total, "killer_count": owned_count}


def build_roster_summary(
    user_id: int,
    perk_service: PerkService,
    ownership_service: OwnershipService,
    build_pages_fn: Callable[[int], list[list[str]]],
    completed_killers: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Generate roster status overview with active streak checkpoints.

    `completed_killers` lets a caller that already fetched this user's
    page_streak completions (e.g. to also resolve the roster-wide milestone)
    pass it in instead of this function querying it again.
    """
    page_count = len(build_pages_fn(user_id))
    runs_db = db.session.scalars(
        select(PageStreakRun).where(PageStreakRun.user_id == user_id)
    ).all()
    runs = {r.killer: r for r in runs_db}
    avatar_map = get_killer_avatar_map(user_id, ownership_service)
    # Read from the persistent completion history, not the run's own status --
    # a per-killer reset wipes the run's status back to "in_progress" but this
    # badge must survive it (that's the whole point of tracking it separately).
    if completed_killers is None:
        completed_killers = fetch_completed_variants(user_id, "page_streak")
    roster: list[dict[str, Any]] = []

    for killer in get_owned_killers_ordered(user_id, perk_service, ownership_service):
        r = runs.get(killer)
        avatar_local_path = avatar_map.get(killer)
        ever_completed = killer in completed_killers
        if r is None:
            roster.append({
                "killer": killer,
                "status": "not_started",
                "attempt": 0,
                "current_page": 0,
                "best_page": 0,
                "page_count": page_count,
                "avatar_local_path": avatar_local_path,
                "ever_completed": ever_completed,
            })
        else:
            roster.append({
                "killer": killer,
                "status": r.status,
                "attempt": r.attempt,
                "current_page": r.current_page,
                "best_page": r.best_page,
                "page_count": len(safe_json_loads(r.pages_json, default=[])),
                "avatar_local_path": avatar_local_path,
                "ever_completed": ever_completed,
            })
    return roster
