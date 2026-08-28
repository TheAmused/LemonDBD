# backend/app/services/page_streak/roster.py
from collections.abc import Callable
from typing import Any
from sqlalchemy import select

from app.core.extensions import db
from app.core.json_provider import safe_json_loads
from app.models import PageStreakRun
from app.services.ownership_service import OwnershipService
from app.services.perk_service import PerkService


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


def build_roster_summary(
    user_id: int,
    perk_service: PerkService,
    ownership_service: OwnershipService,
    build_pages_fn: Callable[[int], list[list[str]]],
) -> list[dict[str, Any]]:
    """Generate roster status overview with active streak checkpoints."""
    page_count = len(build_pages_fn(user_id))
    runs_db = db.session.scalars(
        select(PageStreakRun).where(PageStreakRun.user_id == user_id)
    ).all()
    runs = {r.killer: r for r in runs_db}
    avatar_map = get_killer_avatar_map(user_id, ownership_service)
    roster: list[dict[str, Any]] = []

    for killer in get_owned_killers_ordered(user_id, perk_service, ownership_service):
        r = runs.get(killer)
        avatar_local_path = avatar_map.get(killer)
        if r is None:
            roster.append({
                "killer": killer,
                "status": "not_started",
                "attempt": 0,
                "current_page": 0,
                "best_page": 0,
                "page_count": page_count,
                "avatar_local_path": avatar_local_path,
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
            })
    return roster
