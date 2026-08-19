# backend/app/services/gauntlet/constants.py
from typing import Any, Dict, List

CHECKPOINT_INTERVAL: int = 10
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"

# The original challenge stopped adding killers past The Slasher (Jason) and
# survivors past Kwon Tae-young, so Original mode holds the same two lines
# regardless of how many characters have released since.
ORIGINAL_KILLER_ROSTER_LIMIT: int = 43
ORIGINAL_SURVIVOR_ROSTER_LIMIT: int = 52

# Survivors run a full four-perk build where only the first slot has to be one of
# the character's own teachables; the rest are free picks.
SURVIVOR_TIERS: List[Dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Warm Up", "perk_limit": 4, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Thinning", "perk_limit": 3, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Struggle", "perk_limit": 2, "character_perks_only": False, "description": "Must include at least 1 character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Hardcore", "perk_limit": 1, "character_perks_only": False, "description": "Must be a character teachable perk"},
    {"min_streak": CHECKPOINT_INTERVAL * 4, "tier_level": 4, "name": "The Legend", "perk_limit": 0, "character_perks_only": False, "description": "No perks allowed (no-perk trial)"},
]

# Killers play their own teachables and nothing else, losing one at every
# checkpoint. Thresholds land on the checkpoints (10/20/30) so banking a
# checkpoint and stepping up a tier happen on the same win.
KILLER_TIERS: List[Dict[str, Any]] = [
    {"min_streak": 0, "tier_level": 0, "name": "The Bloodbath", "perk_limit": 3, "character_perks_only": True, "description": "All 3 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL, "tier_level": 1, "name": "The Obsession", "perk_limit": 2, "character_perks_only": True, "description": "Any 2 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 2, "tier_level": 2, "name": "The Executioner", "perk_limit": 1, "character_perks_only": True, "description": "Any 1 of the killer's own perks"},
    {"min_streak": CHECKPOINT_INTERVAL * 3, "tier_level": 3, "name": "The Entity", "perk_limit": 0, "character_perks_only": True, "description": "No perks allowed (no-perk trial)"},
]


def get_tier_info(streak: int, role: str) -> Dict[str, Any]:
    """The last tier the streak has reached. `min_streak` is an internal
    threshold, so it is stripped from the payload the client sees."""
    tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
    tier = tiers[0]
    for candidate in tiers:
        if streak >= candidate["min_streak"]:
            tier = candidate
    info = dict(tier)
    info.pop("min_streak")
    # Carried on every tier payload so the frontend can filter the roster grid
    # and draw pool to the same characters the backend will ever draw, without
    # keeping its own copy of the limit.
    info["roster_limit"] = ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT
    return info
