# backend/app/schemas/changelog.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.changelog import CHANGELOG_TAGS


class ChangelogPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_html: str = Field(..., min_length=1, max_length=20000)
    tag: str = Field(default="feature")
    is_published: bool = True

    def clean_tag(self) -> str:
        return self.tag if self.tag in CHANGELOG_TAGS else "feature"


class ChangelogPostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    content_html: str | None = Field(default=None, min_length=1, max_length=20000)
    tag: str | None = None
    is_published: bool | None = None


class ChangelogPostResponse(BaseModel):
    id: int
    title: str
    content_html: str
    tag: str
    is_published: bool
    author_name: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
