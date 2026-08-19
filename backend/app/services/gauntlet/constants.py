# backend/app/services/gauntlet/constants.py
from typing import Any, Dict, List

CHECKPOINT_INTERVAL: int = 3
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"

SURVIVOR_TIERS: List[Dict[str, Any]] = [
    {
        "tier_level": 0,
        "name": "The Warm Up",
        "perk_limit": 4,
        "description": "Must include at least 1 character teachable perk",
    },
    {
        "tier_level": 1,
        "name": "The Thinning",
        "perk_limit": 3,
        "description": "Must include at least 1 character teachable perk",
    },
    {
        "tier_level": 2,
        "name": "The Struggle",
        "perk_limit": 2,
        "description": "Must include at least 1 character teachable perk",
    },
    {
        "tier_level": 3,
        "name": "The Hardcore",
        "perk_limit": 1,
        "description": "Must be a character teachable perk",
    },
    {
        "tier_level": 4,
        "name": "The Legend",
        "perk_limit": 0,
        "description": "No Perks allowed (No-perk trial)",
    },
]

KILLER_TIERS: List[Dict[str, Any]] = [
    {
        "tier_level": 0,
        "name": "The Warm Up",
        "perk_limit": 4,
        "description": "4 Perks",
    },
    {
        "tier_level": 1,
        "name": "The Restriction",
        "perk_limit": 3,
        "description": "3 Perks",
    },
    {
        "tier_level": 2,
        "name": "The Deprivation",
        "perk_limit": 2,
        "description": "2 Perks",
    },
    {
        "tier_level": 3,
        "name": "The Barebones",
        "perk_limit": 1,
        "description": "1 Perk",
    },
    {
        "tier_level": 4,
        "name": "The Entity's Chosen",
        "perk_limit": 0,
        "description": "0 Perks",
    },
]


def get_tier_info(streak: int, role: str) -> Dict[str, Any]:
    """Calculates tier tier level, description, and perk restrictions based on streak count."""
    tier_index = min(4, max(0, streak // CHECKPOINT_INTERVAL))
    tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
    return dict(tiers[tier_index])

