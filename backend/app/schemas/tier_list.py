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

from app.schemas.common import clean_image_url as _clean_image_url


class TierListAdminTier(BaseModel):
    id: str = Field(..., min_length=1, max_length=40)
    label: str = Field(..., min_length=1, max_length=60)
    color: str = Field(..., min_length=1, max_length=20)
    backgroundImage: str | None = None

    @field_validator("backgroundImage")
    @classmethod
    def _clean_background(cls, value: str | None) -> str | None:
        return _clean_image_url(value)


class TierListAdminItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    image_url: str | None = None

    @field_validator("image_url")
    @classmethod
    def _clean_image(cls, value: str | None) -> str | None:
        return _clean_image_url(value)


class TierListAdminCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(default="", max_length=2000)
    cover_image_url: str | None = None
    tiers: list[TierListAdminTier] = Field(..., min_length=1, max_length=20)
    items: list[TierListAdminItem] = Field(..., min_length=1, max_length=400)

    @field_validator("cover_image_url")
    @classmethod
    def _clean_cover(cls, value: str | None) -> str | None:
        return _clean_image_url(value)
