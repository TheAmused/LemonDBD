# backend/app/schemas/tier_list.py
"""Request shape for an admin hand-authoring an official tier list.

Mirrors the frontend creator's own `Draft` (title, description, tiers,
items, an optional background) one-to-one, so the same object the "Official?"
checkbox submits from `TierListCreator` validates here without translation.
Field-level cleanup mirrors `sanitizeImageUrl` (frontend `codec.ts`): the
frontend already sanitizes every image before it ever reaches this payload,
so this is defense in depth, not the primary guard -- an image that fails it
is dropped rather than failing the whole submission.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import CleanImageUrl


class TierListAdminTier(BaseModel):
    id: str = Field(..., min_length=1, max_length=40)
    label: str = Field(..., min_length=1, max_length=60)
    color: str = Field(..., min_length=1, max_length=20)
    backgroundImage: CleanImageUrl = None


class TierListAdminItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    image_url: CleanImageUrl = None


#: Longest seeded description/translation is 147 chars; rounded up to the next hundred.
#: Keep in sync with `TIER_LIST_LIMITS.maxDescription` on the frontend.
TIER_LIST_DESCRIPTION_MAX = 200


class TierListAdminCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(default="", max_length=TIER_LIST_DESCRIPTION_MAX)
    cover_image_url: CleanImageUrl = None
    tiers: list[TierListAdminTier] = Field(..., min_length=1, max_length=20)
    items: list[TierListAdminItem] = Field(..., min_length=1, max_length=400)


class TierListAdminUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=TIER_LIST_DESCRIPTION_MAX)
    cover_image_url: CleanImageUrl = None
    tiers: list[TierListAdminTier] | None = Field(default=None, min_length=1, max_length=20)
    items: list[TierListAdminItem] | None = Field(default=None, min_length=1, max_length=400)
    default_placements: dict[str, list[str]] | None = None


    @field_validator("default_placements")
    @classmethod
    def _clean_placements(cls, value: dict[str, list[str]] | None) -> dict[str, list[str]] | None:
        if value is None:
            return None
        cleaned: dict[str, list[str]] = {}
        placed_keys: set[str] = set()
        for tier_id, keys in value.items():
            tid = str(tier_id).strip()[:40]
            if not tid or not isinstance(keys, list):
                continue
            valid_keys: list[str] = []
            for k in keys:
                if isinstance(k, str):
                    s = k.strip()[:64]
                    if s and s not in placed_keys:
                        placed_keys.add(s)
                        valid_keys.append(s)
            if valid_keys:
                cleaned[tid] = valid_keys[:400]
        return cleaned or None

