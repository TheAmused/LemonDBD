# backend/app/schemas/smash_or_pass.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class EntityStatResponse(BaseModel):
    id: str
    entity_id: str
    smash_count: int
    pass_count: int
    super_smash_count: int
    total_votes: int
    smash_rate: float
    chaos_rating: float
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class EntityResponse(BaseModel):
    id: str
    roster_id: str
    slug: str
    name: str
    role: str
    gender: str
    media_url: str | None = None
    media_type: str = "image"
    metadata: dict[str, Any] = {}
    order_index: int = 0
    is_active: bool = True
    created_at: datetime | None = None
    stat: EntityStatResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class RosterResponse(BaseModel):
    id: str
    slug: str
    name_i18n_key: str
    description_i18n_key: str
    cover_image_url: str | None = None
    theme_color: str
    category: str
    is_nsfw: bool
    is_active: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class VoteCreate(BaseModel):
    entity_id: str
    vote_type: str = Field(..., pattern=r"^(smash|pass|super_smash)$")
    session_id: str | None = None


class VoteResponse(BaseModel):
    id: str
    entity_id: str
    session_id: str | None = None
    user_id: int | None = None
    vote_type: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
