# backend/app/schemas/chaos.py
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ChaosMatchLogBase(BaseModel):
    killer_id: str
    result: str
    perks: List[Any] = []
    addon_rarities: List[str] = []
    streak_before: int
    streak_after: int


class ChaosMatchLogResponse(ChaosMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChaosRunBase(BaseModel):
    difficulty: str
    status: str = "in_progress"
    current_streak: int = 0
    best_streak: int = 0
    last_checkpoint_streak: int = 0
    perks_revealed: bool = False


class ChaosRunResponse(ChaosRunBase):
    id: int
    user_id: int
    completed_killers: List[str] = []
    checkpoint_killers: List[str] = []
    used_perks: List[str] = []
    checkpoint_used_perks: List[str] = []
    current_perks: List[Dict[str, Any]] = []
    current_addon_rarities: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
