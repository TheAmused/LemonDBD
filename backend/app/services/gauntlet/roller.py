# backend/app/services/gauntlet/roller.py
import random
from typing import Any, Dict, List, Optional, Tuple

from app.services.gauntlet.constants import get_tier_info
from app.services.ownership_service import OwnershipService


def get_owned_character_names(user_id: int, role: str, ownership_service: OwnershipService) -> List[str]:
    """Retrieve character names owned by the user for a given role."""
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_characters(user_id, role=db_role)
    return [c["name"] for c in owned if c["is_owned"]]


def get_unlocked_role_perks(user_id: int, role: str, ownership_service: OwnershipService) -> List[Dict[str, Any]]:
    """Retrieve perks unlocked by the user for a given role."""
    db_role = "Killer" if role == "killer" else "Survivor"
    owned = ownership_service.get_user_perks(user_id, category=db_role)
    return [p for p in owned if p["is_unlocked"]]


def pick_initial_target(user_id: int, role: str, ownership_service: OwnershipService) -> str:
    """Selects an initial target character from owned pool with fallback defaults."""
    names = get_owned_character_names(user_id, role, ownership_service)
    if names:
        return random.choice(names)
    return "Meg Thomas" if role == "survivor" else "The Trapper"


def roll_gauntlet_loadout(
    user_id: int,
    role: str,
    current_streak: int,
    completed_characters: List[str],
    ownership_service: OwnershipService,
    target_character: Optional[str] = None,
) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Selects a target character and rolls a random perk build adhering to streak tier restrictions.
    Returns: (target_character, loadout_dict, tier_info_dict)
    """
    tier_info = get_tier_info(current_streak, role)
    perk_limit = tier_info["perk_limit"]

    role_perks = get_unlocked_role_perks(user_id, role, ownership_service)
    owned_names = get_owned_character_names(user_id, role, ownership_service)

    remaining = [c for c in owned_names if c not in completed_characters]
    if not remaining:
        remaining = owned_names if owned_names else [pick_initial_target(user_id, role, ownership_service)]

    target_char = target_character if target_character else random.choice(remaining)

    selected_perks: List[Dict[str, Any]] = []
    if perk_limit > 0:
        char_perks = [p for p in role_perks if p.get("character_name") == target_char]
        general_perks = [p for p in role_perks if not p.get("character_name")]

        if char_perks:
            max_own = min(2, len(char_perks), perk_limit)
            selected_perks.extend(random.sample(char_perks, max_own))

        needed = perk_limit - len(selected_perks)
        if needed > 0 and general_perks:
            available_gen = [p for p in general_perks if p not in selected_perks]
            if available_gen:
                max_gen = min(1, len(available_gen), needed)
                selected_perks.extend(random.sample(available_gen, max_gen))

        needed = perk_limit - len(selected_perks)
        if needed > 0:
            remaining_pool = [p for p in role_perks if p not in selected_perks]
            if remaining_pool:
                selected_perks.extend(random.sample(remaining_pool, min(needed, len(remaining_pool))))

    loadout = {
        "character": target_char,
        "perks": selected_perks,
        "tier_info": tier_info,
    }

    return target_char, loadout, tier_info

