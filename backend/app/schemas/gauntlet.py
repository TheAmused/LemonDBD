# backend/app/schemas/gauntlet.py
from typing import TypedDict

from app.schemas.streak import PerkPayload


class TierInfo(TypedDict):
    name: str
    tier_level: int
    perk_limit: int
    character_perks_only: bool
    description: str
    roster_limit: int


class GauntletLoadout(TypedDict, total=False):
    # total=False: a run whose stored loadout JSON is missing or broken reads back as {}.
    character: str
    character_perks: list[PerkPayload]
    tier_info: TierInfo


class GauntletMatchLogDict(TypedDict):
    id: int
    run_id: int
    role: str
    character_id: str
    result: str
    perks: list[PerkPayload]
    streak_before: int
    streak_after: int
    timestamp: str | None
    triggered_by: str


class GauntletRunDict(TypedDict):
    id: int
    user_id: int
    role: str
    status: str
    game_mode: str
    target_revealed: bool
    current_character_id: str
    current_streak: int
    best_streak: int
    last_checkpoint_streak: int
    completed_characters: list[str]
    checkpoint_characters: list[str]
    current_loadout: GauntletLoadout
    owned_character_ids: list[int]
    attempts: int
    created_at: str | None
    updated_at: str | None


class GauntletRunState(GauntletRunDict):
    """What every gauntlet endpoint returns: the stored run plus its resolved pool and tier."""
    pool_frozen: bool
    owned_characters: list[str]
    tier_info: TierInfo
