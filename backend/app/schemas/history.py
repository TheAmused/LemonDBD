# backend/app/schemas/history.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HistoryMatchLogBase(BaseModel):
    killer_id: str
    result: str
    row_index: int
    streak_before: int
    streak_after: int
    triggered_by: str = "player"


class HistoryMatchLogResponse(HistoryMatchLogBase):
    id: int
    run_id: int
    timestamp: datetime | None = None

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
    completed_killers: list[str] = []
    unlocked_perk_names: list[str] = []
    owned_killer_ids: list[str] = []
    checkpoint_row_index: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
