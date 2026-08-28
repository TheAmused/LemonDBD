# backend/app/schemas/gauntlet.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class GauntletMatchLogBase(BaseModel):
    role: str
    character_id: str
    result: str
    perks: list[Any] = []
    streak_before: int
    streak_after: int
    triggered_by: str = "player"


class GauntletMatchLogResponse(GauntletMatchLogBase):
    id: int
    run_id: int
    timestamp: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class GauntletRunBase(BaseModel):
    role: str
    status: str = "in_progress"
    game_mode: str = "original"
    target_revealed: bool = False
    current_character_id: str
    current_streak: int = 0
    best_streak: int = 0
    last_checkpoint_streak: int = 0


class GauntletRunCreate(BaseModel):
    user_id: int
    role: str
    starting_character_id: str


class GauntletRunResponse(GauntletRunBase):
    id: int
    user_id: int
    completed_characters: list[str] = []
    checkpoint_characters: list[str] = []
    current_loadout: dict[str, Any] = {}
    owned_character_ids: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
