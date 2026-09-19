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
