# backend/app/services/gauntlet/roller.py
import random
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select

from app.core.extensions import db
from app.models import Character, Perk
from app.services.gauntlet.constants import (
    ORIGINAL_KILLER_ROSTER_LIMIT,
    ORIGINAL_SURVIVOR_ROSTER_LIMIT,
    get_tier_info,
)
from app.services.ownership_service import OwnershipService


def get_owned_character_names(user_id: int, role: str, ownership_service: OwnershipService) -> List[str]:
    """Owned character names for a role, capped to the original challenge's
    roster (43 killers through The Slasher, 52 survivors through Kwon
    Tae-young). A character with no recorded release_number stays in the pool
    rather than being dropped by an unrelated data gap."""
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    limit = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    owned = [
        c for c in owned
        if c.get("release_number") is None or c["release_number"] <= limit
    ]
    return [c["name"] for c in owned if c["is_owned"]]


def get_character_teachable_perks(character_name: str) -> List[Dict[str, Any]]:
    """The target's own teachable perks, shown as the suggested first-slot picks."""
    perks = db.session.scalars(
        select(Perk)
        .join(Character, Perk.character_id == Character.id)
        .where(Character.name == character_name, Perk.is_teachable.is_(True))
        .order_by(Perk.name.asc())
    ).all()
    return [p.to_dict() for p in perks]


def pick_initial_target(user_id: int, role: str, ownership_service: OwnershipService) -> str:
    """Selects an initial target character from the owned pool with fallback defaults."""
    names = get_owned_character_names(user_id, role, ownership_service)
    if names:
        return random.choice(names)
    return "Meg Thomas" if role == "survivor" else "The Trapper"


def roll_gauntlet_target(
    user_id: int,
    role: str,
    current_streak: int,
    completed_characters: List[str],
    ownership_service: OwnershipService,
    target_character: Optional[str] = None,
) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Selects the next target character and its build guide.
    Returns: (target_character, loadout_dict, tier_info_dict)
    """
    tier_info = get_tier_info(current_streak, role)

    owned_names = get_owned_character_names(user_id, role, ownership_service)
    remaining = [c for c in owned_names if c not in completed_characters]
    if not remaining:
        remaining = owned_names if owned_names else [pick_initial_target(user_id, role, ownership_service)]

    target_char = target_character if target_character else random.choice(remaining)

    loadout = {
        "character": target_char,
        "character_perks": get_character_teachable_perks(target_char),
        "tier_info": tier_info,
    }

    return target_char, loadout, tier_info
