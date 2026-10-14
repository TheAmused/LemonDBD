# backend/app/schemas/minigames.py
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class MinigameGuessSubmissionDTO(BaseModel):
    guess_id: Any = Field(...)
    challenge_id: int | str | None = None
    challenge_type: Literal["daily", "repeatable"] = "daily"
    round_index: int = 0
    guess_type: str = "killer"
    attempt_number: int = 1
    custom_round_config: dict[str, Any] | None = None
    custom_round: dict[str, Any] | None = None


class MinigameScoreSubmissionDTO(BaseModel):
    game_mode: str = "classic"
    won: bool = False
    attempts_taken: int | None = None


class MinigameOfficialCreateDTO(BaseModel):
    challenge_date: str | None = None
    game_mode: str = "daily_trial"
    title: str = Field(..., min_length=1)
    description: str = ""
    rounds: list[Any] = Field(..., min_length=1)
