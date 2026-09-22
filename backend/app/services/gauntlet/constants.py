# backend/app/services/gauntlet/constants.py
from typing import Any

from app.schemas.gauntlet import TierInfo

CHECKPOINT_INTERVAL: int = 10
BUILD_SIZE: int = 4
GENERAL_CHARACTER: str = "General"

# The first entry is the default. Every mode keeps its own run per (user, role).
GAME_MODES: tuple[str, ...] = ("original", "lemon_solo", "lemon_duo", "lemon_squad")
DEFAULT_GAME_MODE: str = GAME_MODES[0]

# Modes not listed here bank a checkpoint every CHECKPOINT_INTERVAL wins and step tiers on the same spacing.
CHECKPOINT_INTERVALS: dict[str, int] = {"lemon_solo": 5}
# Survivor modes whose checkpoints, and with them the perk tiers, land on fixed win counts.
# Each start opens the next tier, and the stage after the last one runs to the end of the run.
CHECKPOINT_STAGE_STARTS: dict[str, tuple[int, ...]] = {"lemon_duo": (6, 12, 18), "lemon_squad": (6, 12, 18)}
# Characters the server deals into one match; each is played by its own player.
CHARACTERS_PER_MATCH: dict[str, int] = {"lemon_duo": 2, "lemon_squad": 2}
# People playing each of those characters; modes not listed have one.
PLAYERS_PER_CHARACTER: dict[str, int] = {"lemon_squad": 2}
# The player picks the target character instead of the server rolling one.
PICK_CHARACTER_MODES: tuple[str, ...] = ("lemon_solo",)
# The last, perkless tier deals random unique perks of the target instead of an empty loadout.
RANDOM_PERK_LAST_TIER_MODES: tuple[str, ...] = ("lemon_solo",)
RANDOM_PERK_COUNT: int = 1


def get_characters_per_match(game_mode: str) -> int:
    return CHARACTERS_PER_MATCH.get(game_mode, 1)


def get_players_per_character(game_mode: str) -> int:
    return PLAYERS_PER_CHARACTER.get(game_mode, 1)


def is_checkpoint(streak: int, game_mode: str) -> bool:
    if streak <= 0:
        return False
    stage_starts = CHECKPOINT_STAGE_STARTS.get(game_mode)
    if not stage_starts:
        return streak % CHECKPOINT_INTERVALS.get(game_mode, CHECKPOINT_INTERVAL) == 0
    return streak in stage_starts

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


def get_tier_info(streak: int, role: str, game_mode: str = DEFAULT_GAME_MODE) -> TierInfo:
    tiers = KILLER_TIERS if role == "killer" else SURVIVOR_TIERS
    stage_starts = CHECKPOINT_STAGE_STARTS.get(game_mode) if role == "survivor" else None
    tier = tiers[0]
    tier_starts = (0, *stage_starts) if stage_starts else None
    for candidate in tiers:
        if tier_starts is None:
            min_streak = candidate["min_streak"]
        elif candidate["tier_level"] < len(tier_starts):
            min_streak = tier_starts[candidate["tier_level"]]
        else:
            continue
        if streak >= min_streak:
            tier = candidate
    deals_random_perks = (
        role == "survivor" and tier["perk_limit"] == 0 and game_mode in RANDOM_PERK_LAST_TIER_MODES
    )
    return {
        "name": tier["name"],
        "tier_level": tier["tier_level"],
        "perk_limit": tier["perk_limit"],
        "character_perks_only": tier["character_perks_only"],
        "description": "A random unique perk of your character" if deals_random_perks else tier["description"],
        "roster_limit": ORIGINAL_KILLER_ROSTER_LIMIT if role == "killer" else ORIGINAL_SURVIVOR_ROSTER_LIMIT,
        "random_perk_count": RANDOM_PERK_COUNT if deals_random_perks else 0,
    }
