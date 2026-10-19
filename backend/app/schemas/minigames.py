# backend/app/schemas/minigames.py
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class MinigameGuessSubmissionDTO(BaseModel):
    guess_id: int | str | None = None
    challenge_id: int | str | None = None
    #: "custom" = a trial that only exists in the player's browser; graded against
    #: `custom_round_config`. Official challenges are graded against the stored round.
    challenge_type: Literal["daily", "repeatable", "custom"] = "daily"
    round_index: int = Field(default=0, ge=0, le=100)
    guess_type: str = Field(default="killer", max_length=20)
    attempt_number: int = Field(default=1, ge=1, le=100)
    #: Ends the round without a guess and returns the answer.
    give_up: bool = False
    custom_round_config: dict[str, Any] | None = None
    custom_round: dict[str, Any] | None = None


class MinigameOfficialCreateDTO(BaseModel):
    challenge_date: str | None = None
    game_mode: str = "daily_trial"
    title: str = Field(..., min_length=1)
    description: str = ""
    rounds: list[Any] = Field(..., min_length=1)
