# backend/app/services/chaos/constants.py
DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hell")

# 0 means no checkpoint: one loss fully resets the run.
CHAOS_CHECKPOINT_INTERVAL: dict[str, int] = {"easy": 5, "medium": 10, "hell": 0}

# "Event" rarity addons are excluded as they are tied to limited-time events.
ADDON_RARITY_POOL: list[str] = ["Common", "Uncommon", "Rare", "Very Rare", "Ultra Rare"]


def checkpoint_interval(difficulty: str) -> int:
    return CHAOS_CHECKPOINT_INTERVAL.get(difficulty, 0)
