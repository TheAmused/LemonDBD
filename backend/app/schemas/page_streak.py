# backend/app/schemas/page_streak.py
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PageStreakPageLogBase(BaseModel):
    attempt: int
    page_number: int
    perks: List[Any] = []
    result: str


class PageStreakPageLogResponse(PageStreakPageLogBase):
    id: int
    run_id: int
    timestamp: Optional[datetime] = None

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
    pages: List[Any] = []
    snapshot_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

