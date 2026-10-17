# backend/app/schemas/changelog.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ChangelogPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_html: str = Field(..., min_length=1, max_length=20000)
    is_published: bool = True


class ChangelogPostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    content_html: str | None = Field(default=None, min_length=1, max_length=20000)
    is_published: bool | None = None


class ChangelogPostResponse(BaseModel):
    id: int
    title: str
    content_html: str
    #: Manual admin sort order for the "What's New?" feed. On the model and on
    #: `to_dict()`, but was missing here.
    position: int = 0
    is_published: bool
    created_at: datetime | None = None
    published_at: datetime | None = None
    edited_at: datetime | None = None
    discord_announced_at: datetime | None = None
    discord_synced_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
