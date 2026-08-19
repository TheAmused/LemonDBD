# backend/app/schemas/gauntlet.py
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GauntletMatchLogBase(BaseModel):
    role: str
    character_id: str
    result: str
    perks: List[Any] = []
    streak_before: int
    streak_after: int


class GauntletMatchLogResponse(GauntletMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GauntletMatchExceptionBase(BaseModel):
    character_id: str
    reason: str


class GauntletMatchExceptionResponse(GauntletMatchExceptionBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GauntletRunBase(BaseModel):
    role: str
    status: str = "in_progress"
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
    completed_characters: List[str] = []
    checkpoint_characters: List[str] = []
    current_loadout: Dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

