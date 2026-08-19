# backend/app/services/chaos/constants.py
from typing import Dict, Tuple

DIFFICULTIES: Tuple[str, ...] = ("easy", "medium", "hell")

# 0 means no checkpoint: one loss fully resets the run.
CHAOS_CHECKPOINT_INTERVAL: Dict[str, int] = {"easy": 5, "medium": 10, "hell": 0}

# "Event" rarity addons are tied to limited-time in-game events and are not
# reliably available to every player, so they are excluded from the draw.
ADDON_RARITY_POOL = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]


def checkpoint_interval(difficulty: str) -> int:
    return CHAOS_CHECKPOINT_INTERVAL.get(difficulty, 0)
