# backend/app/services/gauntlet/constants.py
from typing import Any

CHECKPOINT_INTERVAL: int = 10
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"

ORIGINAL_KILLER_ROSTER_LIMIT: int = 43
ORIGINAL_SURVIVOR_ROSTER_LIMIT: int = 52

SURVIVOR_TIERS: list[dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Warm Up", "perk_limit": 4, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Thinning", "perk_limit": 3, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Struggle", "perk_limit": 2, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Hardcore", "perk_limit": 1, "character_perks_only": False, "description": "Must be a character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 4, "tier_level": 4, "name": "The Legend", "perk_limit": 0, "character_perks_only": False, "description": "No perks allowed (no-perk trial)"},
]

KILLER_TIERS: list[dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Bloodbath", "perk_limit": 3, "character_perks_only": True, "description": "All 3 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Obsession", "perk_limit": 2, "character_perks_only": True, "description": "Any 2 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Executioner", "perk_limit": 1, "character_perks_only": True, "description": "Any 1 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Entity", "perk_limit": 0, "character_perks_only": True, "description": "No perks allowed (no-perk trial)"},
]


def get_tier_info(streak: int, role: str) -> dict[str, Any]:
    tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
    tier = tiers[0]
    for candidate in tiers:
        if streak >= candidate["min_streak"]:
            tier = candidate
    info = dict(tier)
    info.pop("min_streak")
    info["roster_limit"] = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    return info
