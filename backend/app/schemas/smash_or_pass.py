# backend/app/schemas/smash_or_pass.py
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.smash_or_pass import TRANSLATABLE_LOCALES
from app.schemas.common import clean_image_url


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


# ---------------------------------------------------------------------------
# Admin-authored official rosters -- POST /api/v1/smash-or-pass/rosters.
#
# Mirrors `TierListAdminCreate` (tier_list.py): the frontend creator posts the
# same shape it already builds for a local custom roster, plus an admin-only
# `translations` blob per roster and per entity (the tier-list creator never
# collects translations; this one does, because a roster this is intended to
# stay live for every visitor is worth authoring in de/es/ja/pl up front).
# Field-level cleanup mirrors `sanitizeImageUrl`/`sanitizeMediaUrl` on the
# frontend (`utils/smashOrPass/codec.ts`): the frontend already sanitizes
# every URL before it reaches this payload, so this is defense in depth, not
# the primary guard -- an unsafe URL is dropped rather than failing the whole
# submission.
# ---------------------------------------------------------------------------


class SmashRosterTranslationAdmin(BaseModel):
    """A roster's `translations[<locale>]` entry: only fields that differ
    from the English `name`/`description` columns belong here."""

    name: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=2000)


class SmashEntityTranslationAdmin(BaseModel):
    """An entity's `translations[<locale>]` entry, restricted to exactly the
    columns `TRANSLATABLE_FIELDS` allows overriding. Any other key a client
    sends under a locale is silently dropped by Pydantic rather than erroring,
    matching how the model layer already treats an unknown field."""

    archetype: str | None = Field(default=None, max_length=128)
    bio: str | None = Field(default=None, max_length=4000)
    tagline: str | None = Field(default=None, max_length=200)
    quote: str | None = Field(default=None, max_length=500)
    meme: str | None = Field(default=None, max_length=300)
    turn_on: str | None = Field(default=None, max_length=300)
    dealbreaker: str | None = Field(default=None, max_length=300)
    dating_vibe: str | None = Field(default=None, max_length=300)
    red_flags: list[str] | None = Field(default=None, max_length=20)
    green_flags: list[str] | None = Field(default=None, max_length=20)


def _filter_known_locales(value: dict[str, Any] | None) -> dict[str, Any]:
    """Only `TRANSLATABLE_LOCALES` (de/es/ja/pl) may carry an override --
    English lives in the columns, and any other key is dropped rather than
    rejected, the same leniency `_entity_profile`/`Roster.localized` already
    extend to a stray key in a seed file."""
    if not value:
        return {}
    return {k: v for k, v in value.items() if k in TRANSLATABLE_LOCALES}


class SmashEntityAdminCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    real_name: str | None = Field(default=None, max_length=128)
    role: str = Field(default="Survivor", min_length=1, max_length=32)
    gender: str = Field(default="female", min_length=1, max_length=32)
    media_url: str | None = None
    media_type: str = Field(default="image", max_length=16)
    watermark_left: str | None = Field(default=None, max_length=64)
    watermark_right: str | None = Field(default=None, max_length=64)

    archetype: str | None = Field(default=None, max_length=128)
    bio: str = Field(default="", max_length=4000)
    tagline: str = Field(default="", max_length=200)
    quote: str = Field(default="", max_length=500)
    meme: str = Field(default="", max_length=300)
    turn_on: str = Field(default="", max_length=300)
    dealbreaker: str = Field(default="", max_length=300)
    dating_vibe: str = Field(default="", max_length=300)
    red_flags: list[str] = Field(default_factory=list, max_length=20)
    green_flags: list[str] = Field(default_factory=list, max_length=20)
    chapter: str | None = Field(default=None, max_length=128)
    danger_level: str | None = Field(default=None, max_length=32)
    chaos_score: int | None = Field(default=None, ge=0, le=100)

    #: Admin translation authoring, keyed by locale. Absent field/locale = English.
    translations: dict[str, SmashEntityTranslationAdmin] = Field(default_factory=dict)

    @field_validator("media_url")
    @classmethod
    def _clean_media(cls, value: str | None) -> str | None:
        return clean_image_url(value)

    @field_validator("translations", mode="before")
    @classmethod
    def _filter_translations(cls, value: Any) -> dict[str, Any]:
        return _filter_known_locales(value)


class SmashRosterAdminCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(default="", max_length=2000)
    cover_image_url: str | None = None
    theme_color: str = Field(default="#ff0055", min_length=1, max_length=32)
    category: str = Field(default="DBD", min_length=1, max_length=64)
    is_nsfw: bool = False
    #: Admin translation authoring for the roster's own name/description.
    translations: dict[str, SmashRosterTranslationAdmin] = Field(default_factory=dict)
    entities: list[SmashEntityAdminCreate] = Field(..., min_length=1, max_length=200)

    @field_validator("cover_image_url")
    @classmethod
    def _clean_cover(cls, value: str | None) -> str | None:
        return clean_image_url(value)

    @field_validator("translations", mode="before")
    @classmethod
    def _filter_translations(cls, value: Any) -> dict[str, Any]:
        return _filter_known_locales(value)


class SmashTaxonomyRegister(BaseModel):
    type: str = Field(..., pattern=r"^(role|gender)$")
    name: str = Field(..., min_length=1, max_length=64)


class SmashTaxonomiesResponse(BaseModel):
    roles: list[str]
    genders: list[str]
