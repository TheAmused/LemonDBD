# backend/app/schemas/id_please.py
from typing import Literal, TypedDict

from pydantic import BaseModel, Field, StrictInt


class IdPleaseLoadout(TypedDict):
    number: int
    side: str
    character_id: int
    perk_ids: list[int]


class IdPleaseMatchLogDict(TypedDict):
    id: int
    run_id: int
    match_number: int
    side: str
    character_id: int
    perk_ids: list[int]
    roster_fingerprint: str
    result: str
    attempt: int
    streak_before: int
    streak_after: int
    timestamp: str | None
    triggered_by: str


class IdPleaseRunDict(TypedDict):
    id: int
    user_id: int
    lane: str
    difficulty: str
    algo_version: int
    status: str
    current_streak: int
    best_streak: int
    last_checkpoint_streak: int
    opening_side: str
    opening_perk_ids: list[int]
    current_match: int
    current_loadout: dict[str, object]
    before_loadout: dict[str, object]
    used_character_ids: dict[str, object]
    checkpoint_loadout: dict[str, object]
    attempts: int
    attempt: int
    total_wins: int
    total_losses: int
    playthrough_matches: int
    created_at: str | None
    updated_at: str | None


# -- request bodies ------------------------------------------------------------

class IdPleaseOpeningDTO(BaseModel):
    run_id: StrictInt
    side: Literal["killer", "survivor"]
    perk_positions: list[StrictInt] = Field(..., min_length=1, max_length=16)
    roster_fingerprint: str | None = Field(default=None, max_length=64)


class IdPleaseResultDTO(BaseModel):
    run_id: StrictInt
    match_number: StrictInt
    result: Literal["win", "loss"]
    roster_fingerprint: str | None = Field(default=None, max_length=64)
