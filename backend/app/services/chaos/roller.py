# backend/app/services/chaos/roller.py
import random
from typing import Any, Dict, List, Tuple

from sqlalchemy import select

from app.core.extensions import db
from app.models import Perk
from app.services.chaos.constants import ADDON_RARITY_POOL
from app.services.ownership_service import OwnershipService


def get_owned_killer_names(user_id: int, ownership_service: OwnershipService) -> List[str]:
    """Every killer the user owns. Unlike Gauntlet Original, no roster cap."""
    owned = ownership_service.get_user_characters(user_id, role="Killer")
    return [c["name"] for c in owned if c["is_owned"]]


def get_unlocked_killer_perks(user_id: int, ownership_service: OwnershipService) -> List[Dict[str, Any]]:
    """Every unlocked perk in the Killer category, teachables of any killer plus general perks."""
    perks = ownership_service.get_user_perks(user_id, category="Killer")
    return [p for p in perks if p["is_unlocked"]]


def resolve_perks_by_names(names: List[str]) -> List[Dict[str, Any]]:
    """Turns a frozen name list back into full perk dicts (icon, description).
    Plain DB lookup, no lang param -- this is an internal service call, not
    the locale-aware /api/v1/perks route, so it can't reintroduce the
    Page-Streak-icon-style name/translation drift."""
    if not names:
        return []
    perks = db.session.scalars(select(Perk).where(Perk.name.in_(names), Perk.category == "Killer")).all()
    by_name = {p.name: p.to_dict() for p in perks}
    return [by_name[n] for n in names if n in by_name]


def draw_chaos_perks(
    unlocked_perks: List[Dict[str, Any]],
    used_perk_names: List[str],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Draws 4 perks one at a time without repeating a perk already in
    used_perk_names. If the eligible pool runs out mid-draw, the whole pool
    becomes eligible again (used_perk_names resets) and drawing continues,
    so a single round can span both the tail of one cycle and the start of
    the next. A pool with fewer than 4 distinct perks total will repeat
    within the same draw rather than fail.
    Returns (drawn_perks, updated_used_perk_names).
    """
    if not unlocked_perks:
        return [], list(used_perk_names)

    used = list(used_perk_names)
    drawn: List[Dict[str, Any]] = []

    for _ in range(4):
        eligible = [p for p in unlocked_perks if p["name"] not in used]
        if not eligible:
            used = []
            eligible = list(unlocked_perks)
        pick = random.choice(eligible)
        drawn.append(pick)
        used.append(pick["name"])

    return drawn, used


def draw_addon_rarities() -> List[str]:
    """Two independent picks from ADDON_RARITY_POOL; duplicates are allowed."""
    return [random.choice(ADDON_RARITY_POOL), random.choice(ADDON_RARITY_POOL)]
