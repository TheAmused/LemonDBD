# backend/app/schemas/chaos.py
from typing import TypedDict

from app.schemas.streak import PerkPayload


class ChaosMatchLogDict(TypedDict):
    id: int
    run_id: int
    killer_id: str
    result: str
    perks: list[PerkPayload]
    addon_rarities: list[str]
    streak_before: int
    streak_after: int
    timestamp: str | None
    triggered_by: str


class ChaosRunDict(TypedDict):
    id: int
    user_id: int
    difficulty: str
    status: str
    current_streak: int
    best_streak: int
    last_checkpoint_streak: int
    completed_killers: list[str]
    checkpoint_killers: list[str]
    used_perks: list[str]
    checkpoint_used_perks: list[str]
    current_perks: list[PerkPayload]
    current_addon_rarities: list[str]
    owned_killer_ids: list[int]
    unlocked_perk_ids: list[int]
    perks_revealed: bool
    attempts: int
    created_at: str | None
    updated_at: str | None


class ChaosRunState(ChaosRunDict):
    """What every chaos endpoint returns: the stored run plus its resolved pool."""
    pool_frozen: bool
    owned_killers: list[str]
    unlocked_perks: list[str]
    checkpoint_interval: int
