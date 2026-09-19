# backend/app/schemas/streak.py
"""Response shapes shared by every challenge mode (gauntlet, chaos, history,
page streak). TypedDicts rather than Pydantic models: services build these
dicts directly and hand them to `jsonify`, so the type costs nothing at
runtime. Mirrors `frontend/src/types/*Streak.ts` and `challengeCompletion.ts`."""
from typing import TypedDict

# One row of `Perk.to_dict()`, carried through run state as stored JSON.
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
