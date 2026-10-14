# backend/app/schemas/community.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BugReportBase(BaseModel):
    reporter_name: str = Field(..., max_length=100)
    reporter_email: str | None = Field(None, max_length=150)
    title: str = Field(..., max_length=200)
    message: str
    images: list[str] = []


class BugReportCreate(BugReportBase):
    user_id: int | None = None


class BugReportResponse(BugReportBase):
    id: int
    user_id: int | None = None
    status: str
    admin_notes: str | None = ""
    feedback_unread: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
