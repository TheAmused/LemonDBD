# backend/app/schemas/smash_or_pass.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class EntityStatResponse(BaseModel):
    # The surrogate `id` is gone: `entity_id` is the primary key of a strictly
    # 1:1 table, so it was the only identity this row ever had.
    entity_id: str
    smash_count: int
    pass_count: int
    super_smash_count: int
    # Generated columns. The database computes them from the three counts, so
    # they are outputs only -- nothing may send them in.
    total_votes: int = Field(0, frozen=True)
    smash_rate: float = Field(0.0, frozen=True)
    chaos_rating: float
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class EntityResponse(BaseModel):
    id: str
    roster_id: str
    slug: str
    name: str
    real_name: str | None = None
    role: str
    gender: str
    media_url: str | None = None
    media_type: str = "image"
    watermark_left: str | None = None
    watermark_right: str | None = None

    # ---- the profile, in English. Was the `metadata_json` blob. ----
    archetype: str | None = None
    bio: str = ""
    tagline: str = ""
    quote: str = ""
    meme: str = ""
    turn_on: str = ""
    dealbreaker: str = ""
    dating_vibe: str = ""
    red_flags: list[str] = []
    green_flags: list[str] = []
    chapter: str | None = None
    danger_level: str | None = None
    chaos_score: int | None = None
    #: de/es/ja/pl only, and only the fields that differ from the columns above.
    translations: dict[str, Any] = {}

    #: The assembled view of the fields above, as `Entity.to_dict()` emits it --
    #: once. It used to be emitted twice, as `metadata` and `metadata_json`.
    metadata: dict[str, Any] = {}
    order_index: int = 0
    is_active: bool = True
    created_at: datetime | None = None
    stat: EntityStatResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class RosterResponse(BaseModel):
    id: str
    slug: str
    name: str
    description: str = ""
    translations: dict[str, Any] | None = None
    cover_image_url: str | None = None
    theme_color: str
    category: str
    is_nsfw: bool
    is_active: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# Aliases for interface compliance and versatility
RosterOut = RosterResponse
EntityOut = EntityResponse
RosterBase = RosterResponse
RosterCreate = RosterResponse
RosterUpdate = RosterResponse
EntityBase = EntityResponse


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
