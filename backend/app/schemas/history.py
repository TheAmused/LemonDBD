# backend/app/schemas/history.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class HistoryMatchLogBase(BaseModel):
    killer_id: str
    result: str
    row_index: int
    streak_before: int
    streak_after: int


class HistoryMatchLogResponse(HistoryMatchLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class HistoryRunBase(BaseModel):
    mode: str
    status: str = "in_progress"
    current_row_index: int = 0
    total_killers_beaten: int = 0
    best_killers_beaten: int = 0


class HistoryRunResponse(HistoryRunBase):
    id: int
    user_id: int
    completed_killers: List[str] = []
    unlocked_perk_names: List[str] = []
    checkpoint_row_index: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
