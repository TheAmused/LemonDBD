# backend/app/schemas/changelog.py
from pydantic import BaseModel, Field


class ChangelogPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_html: str = Field(..., min_length=1, max_length=20000)
    is_published: bool = True


class ChangelogPostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    content_html: str | None = Field(default=None, min_length=1, max_length=20000)
    is_published: bool | None = None
