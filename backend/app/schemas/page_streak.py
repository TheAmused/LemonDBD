# backend/app/schemas/page_streak.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class PageStreakPageLogBase(BaseModel):
    attempt: int
    page_number: int
    perks: list[Any] = []
    result: str
    triggered_by: str = "player"


class PageStreakPageLogResponse(PageStreakPageLogBase):
    id: int
    run_id: int
    timestamp: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PageStreakRunBase(BaseModel):
    killer: str
    status: str = "in_progress"
    attempt: int = 1
    current_page: int = 1
    best_page: int = 0


class PageStreakRunCreate(BaseModel):
    user_id: int
    killer: str


class PageStreakRunResponse(PageStreakRunBase):
    id: int
    user_id: int
    pages: list[Any] = []
    snapshot_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
