# backend/app/services/page_streak/roster.py
import logging
from collections.abc import Callable, Collection, Mapping
from typing import Any, TypedDict
from sqlalchemy import func, select

from app.core.extensions import db
from app.models import Killer, PageStreakRun
from app.services.challenge_completions import fetch_completed_pages, fetch_completed_variants
from app.services.ownership.characters import get_owned_killers
from app.services.ownership_service import OwnershipService
from app.services.perks import PerkService

logger = logging.getLogger(__name__)

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
        logger.warning("Could not load characters for release numbers", exc_info=True)
        return {}

    numbers: dict[str, int] = {}
    for character in characters:
        name = (character or {}).get("name")
        release_number = (character or {}).get("release_number")
        if name and isinstance(release_number, int) and name not in numbers:
            numbers[name] = release_number
    return numbers


class RosterKiller(TypedDict):
    owned: bool
    disabled: bool
    disabled_reason: str | None


def get_roster_killers(user_id: int, perk_service: PerkService, ownership_service: OwnershipService) -> dict[str, RosterKiller]:
    """Every killer in the game, by release sequence, as name -> ownership and kill-switch state.

    Killers an admin disabled stay listed, flagged `disabled`, so the roster can mark them; they cannot be played.
    The roster also shows killers the user does not own.
    """
    characters = ownership_service.get_user_characters(user_id, role="Killer")
    release_numbers = get_character_release_numbers(perk_service)

    def sort_key(name: str):
        position = release_numbers.get(name)
        if position is None:
            return (1, 0, name)
        return (0, position, name)

    by_name = {c["name"]: c for c in characters}
    return {
        name: {
            "owned": bool(by_name[name]["is_owned"]),
            "disabled": bool(by_name[name].get("is_disabled")),
            "disabled_reason": by_name[name].get("disabled_reason"),
        }
        for name in sorted(by_name, key=sort_key)
    }


def get_owned_killers_ordered(user_id: int, perk_service: PerkService, ownership_service: OwnershipService) -> list[str]:
    """Retrieve owned killer names sorted by release sequence."""
    return [
        name
        for name, killer in get_roster_killers(user_id, perk_service, ownership_service).items()
        if killer["owned"] and not killer["disabled"]
    ]


def killer_avatar_map(killers: list[dict[str, Any]]) -> dict[str, str]:
    """Name -> avatar_local_path for these killers (the roster also shows the ones the user does not own)."""
    return {c["name"]: c["avatar_local_path"] for c in killers if c.get("avatar_local_path")}


def get_killer_avatar_map(user_id: int, ownership_service: OwnershipService) -> dict[str, str]:
    """Name -> avatar_local_path for every killer the user's roster lists."""
    return killer_avatar_map(ownership_service.get_user_characters(user_id, role="Killer"))


def get_owned_killer_ids(user_id: int, ownership_service: OwnershipService) -> dict[str, int]:
    """Name -> Killer.id for the user's owned, non-disabled killers.

    Keyed by name (to line up with how individual page-streak completions
    are recorded); the id is kept alongside it so a killer rename can't
    silently break identity elsewhere, the same stable-id convention
    `app.services.roster_milestone.get_full_roster_milestone` uses for the
    other three modes -- Page Streak's own live badge just doesn't need it,
    since it only counts owned killers here.
    """
    return get_owned_killers(user_id, ownership_service, shape="name_to_id")


def get_live_roster_badge(
    user_id: int,
    ownership_service: OwnershipService,
    completed_killers: Collection[str] | None = None,
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
        select(func.count()).select_from(Killer).where(
            Killer.is_disabled.is_(False),
        )
    ) or 0
    owned_count = len(owned_ids)
    return {"completed": True, "full_roster": owned_count == game_total, "killer_count": owned_count}


def build_roster_summary(
    user_id: int,
    perk_service: PerkService,
    ownership_service: OwnershipService,
    build_pages_fn: Callable[[int], list[list[str]]],
    completed_pages: Mapping[str, int | None] | None = None,
) -> list[dict[str, Any]]:
    """Generate roster status overview with active streak checkpoints.

    `completed_pages` (killer -> most pages it was cleared on) lets a caller that already fetched this
    user's page_streak completions (e.g. to also resolve the roster-wide milestone) pass it in instead
    of this function querying it again.
    """
    page_count = len(build_pages_fn(user_id))
    runs_db = db.session.scalars(
        select(PageStreakRun).where(PageStreakRun.user_id == user_id)
    ).all()
    runs = {r.killer: r for r in runs_db}
    avatar_map = get_killer_avatar_map(user_id, ownership_service)
    # Read from the persistent completion history, not the run's own status --
    # a per-killer abandon wipes the run's status back to "in_progress" but this
    # badge must survive it (that's the whole point of tracking it separately).
    if completed_pages is None:
        completed_pages = fetch_completed_pages(user_id, "page_streak")
    roster: list[dict[str, Any]] = []

    for killer, flags in get_roster_killers(user_id, perk_service, ownership_service).items():
        r = runs.get(killer)
        common = {
            "killer": killer,
            "avatar_local_path": avatar_map.get(killer),
            "ever_completed": killer in completed_pages,
            # The most pages the killer was cleared on; None when it never was or the clear predates the count.
            "completed_pages": completed_pages.get(killer),
            "owned": flags["owned"],
            "disabled": flags["disabled"],
            "disabled_reason": flags["disabled_reason"],
        }
        # Opening a killer creates its run, but nothing is started until the first match is played.
        if r is None or (r.status == "in_progress" and r.attempt_matches == 0):
            roster.append({
                **common,
                "status": "not_started",
                "attempt": r.attempt if r else 0,
                "current_page": 0,
                "best_page": r.best_page if r else 0,
                "page_count": page_count,
            })
        else:
            roster.append({
                **common,
                "status": r.status,
                "attempt": r.attempt,
                "current_page": r.current_page,
                "best_page": r.best_page,
                "page_count": len(r.pages) or page_count,
            })
    return roster
