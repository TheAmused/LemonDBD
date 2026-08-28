# backend/app/schemas/chaos.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class ChaosMatchLogBase(BaseModel):
    killer_id: str
    result: str
    perks: list[Any] = []
    addon_rarities: list[str] = []
    streak_before: int
    streak_after: int
    triggered_by: str = "player"


class ChaosMatchLogResponse(ChaosMatchLogBase):
    id: int
    run_id: int
    timestamp: datetime | None = None

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
    completed_killers: list[str] = []
    checkpoint_killers: list[str] = []
    used_perks: list[str] = []
    checkpoint_used_perks: list[str] = []
    current_perks: list[dict[str, Any]] = []
    current_addon_rarities: list[str] = []
    owned_killer_ids: list[str] = []
    unlocked_perk_ids: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
