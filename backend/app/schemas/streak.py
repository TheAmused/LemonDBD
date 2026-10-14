# backend/app/schemas/streak.py
"""Response shapes shared by every challenge mode. Mirrors
`frontend/src/types/*Streak.ts` and `challengeCompletion.ts`."""
from typing import TypedDict

# One `Perk.to_dict()` row.
type PerkPayload = dict[str, object]


class StreakStats[LogT](TypedDict):
    total_matches: int
    wins: int
    losses: int
    win_rate: float
    recent_logs: list[LogT]


class ChallengeCompletionDict(TypedDict):
    id: int
    mode: str
    variant: str
    attempts_taken: int
    matches_played: int
    unlocked_characters_count: int
    full_roster: bool
    completed_at: str | None


from typing import Literal
from pydantic import BaseModel, Field


class StreakRunStartDTO(BaseModel):
    killer: str = Field(..., min_length=1)


class PageStreakResultDTO(BaseModel):
    killer: str = Field(..., min_length=1)
    page: int
    perks: list[str] = Field(..., min_length=1)
    result: Literal["win", "loss"]


class GauntletResultDTO(BaseModel):
    role: Literal["survivor", "killer"]
    run_id: int
    result: Literal["win", "loss"]
    use_shield: bool = False


class GauntletTargetDTO(BaseModel):
    run_id: int
    character: str = Field(..., min_length=1)


class GauntletBoostDTO(BaseModel):
    run_id: int
    boost: Literal["reroll", "pick", "slot"]
    character: str | None = None


class StreakResultDTO(BaseModel):
    run_id: int
    result: Literal["win", "loss"]
    killer_id: str = Field(..., min_length=1)

