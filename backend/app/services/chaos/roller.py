# backend/app/services/chaos/roller.py
import random
from typing import Any, Dict, List, Tuple

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

    # Return unique drawn perk names from this draw
    drawn_names = []
    seen = set()
    for p in drawn:
        if p["name"] not in seen:
            drawn_names.append(p["name"])
            seen.add(p["name"])

    return drawn, drawn_names


def draw_addon_rarities() -> List[str]:
    """Two independent picks from ADDON_RARITY_POOL; duplicates are allowed."""
    return [random.choice(ADDON_RARITY_POOL), random.choice(ADDON_RARITY_POOL)]
