# backend/app/models/smash_or_pass.py
"""Smash-or-pass rosters, entities, their vote tallies and the votes themselves.

`entities.metadata_json` used to be a single JSON blob, and it stored the same
sentence up to **six** times. For all 148 entities, every one of these held
identical content:

  * `turnOn` / `turn_on`, `redFlags` / `red_flags`, `greenFlags` / `green_flags`,
    `datingVibe` / `dating_vibe` -- camelCase and snake_case twins, equal on
    148/148.
  * `title` / `archetype` -- equal on 148/148.
  * `i18n` / `translations` -- two five-locale blobs, differing on exactly one
    field (`pl.quote`, where the `i18n` copy was the untranslated English string
    on 145 of 148). `translations` was the good copy; `i18n` is gone.
  * the top-level English (`bio`, `meme`, `quote`, `title`, `tagline`,
    `turn_on`, `red_flags`, `dating_vibe`, `dealbreaker`, `green_flags`)
    restating `i18n.en` and `translations.en` -- 148/148 on every field.
  * `compatibility_tags`, which was exactly `[archetype, role, gender]` on
    148/148 -- three values the row already carries.

So the English is a column, the other four locales are a `translations` blob of
*differences*, and everything derived is a property. The frontend's
three-deep fallback chain (`locMeta.x || meta.x || meta.camelX`) existed only to
paper over those spellings; with one spelling it is one lookup.
"""
import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


def _json_column(**kw: Any):
    return mapped_column(JSONB().with_variant(JSON(), "sqlite"), **kw)


#: The locales `translations` may carry. English is never among them: it lives
#: in the columns, and an "en" entry could only ever restate one.
TRANSLATABLE_LOCALES = ("de", "es", "ja", "pl")

#: Entity fields a translation entry may override. Anything else in a blob is
#: dropped on import.
TRANSLATABLE_FIELDS = (
    "archetype",
    "bio",
    "tagline",
    "quote",
    "meme",
    "turn_on",
    "dealbreaker",
    "dating_vibe",
    "red_flags",
    "green_flags",
)


class Roster(Base):
    __tablename__ = "rosters"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name_i18n_key: Mapped[str] = mapped_column(String(128), nullable=False)
    description_i18n_key: Mapped[str] = mapped_column(String(256), nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(32), default="#ff0055", nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="DBD", nullable=False)
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    # Default (lazy) loading: nothing in the codebase reads `.entities` directly
    # (entity queries always go through Entity/EntityStat selects of their own),
    # so eager-loading it on every Roster fetch was pure cost. Cascade delete
    # still works -- it only needs the collection at flush time, regardless of
    # the read-time loading strategy.
    entities: Mapped[list["Entity"]] = relationship(
        "Entity",
        back_populates="roster",
        cascade="all, delete-orphan",
        order_by="Entity.order_index",
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "slug": self.slug,
            "name_i18n_key": self.name_i18n_key,
            "description_i18n_key": self.description_i18n_key,
            "cover_image_url": self.cover_image_url,
            "theme_color": self.theme_color,
            "category": self.category,
            "is_nsfw": self.is_nsfw,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Entity(Base):
    """One votable character. The profile fields are columns, not a blob."""

    __tablename__ = "entities"
    __table_args__ = (
        Index("ix_entities_roster_order", "roster_id", "order_index"),
        CheckConstraint(
            "chaos_score IS NULL OR (chaos_score >= 0 AND chaos_score <= 100)",
            name="ck_entities_chaos_score",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    roster_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rosters.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="Survivor", nullable=False)
    gender: Mapped[str] = mapped_column(String(32), default="female", nullable=False)
    media_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    media_type: Mapped[str] = mapped_column(String(16), default="image", nullable=False)

    # ---- the profile, in English. Was `metadata_json`, three times over. ----
    #: Was stored twice, as `title` and `archetype`, identical on all 148 rows.
    archetype: Mapped[str | None] = mapped_column(String(128), nullable=True)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tagline: Mapped[str] = mapped_column(Text, default="", nullable=False)
    quote: Mapped[str] = mapped_column(Text, default="", nullable=False)
    meme: Mapped[str] = mapped_column(Text, default="", nullable=False)
    turn_on: Mapped[str] = mapped_column(Text, default="", nullable=False)
    dealbreaker: Mapped[str] = mapped_column(Text, default="", nullable=False)
    dating_vibe: Mapped[str] = mapped_column(Text, default="", nullable=False)
    #: Genuinely list-valued, so genuinely JSON -- unlike everything above it.
    red_flags: Mapped[list[str]] = _json_column(default=list, nullable=False)
    green_flags: Mapped[list[str]] = _json_column(default=list, nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(128), nullable=True)
    danger_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    chaos_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    #: de/es/ja/pl only, and only the fields that actually differ from the
    #: columns above. An "en" key here would restate a column by definition.
    translations: Mapped[dict[str, Any] | None] = _json_column(default=dict, nullable=True)

    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    roster: Mapped["Roster"] = relationship("Roster", back_populates="entities")
    stat: Mapped["EntityStat | None"] = relationship(
        "EntityStat", back_populates="entity", uselist=False,
        cascade="all, delete-orphan", lazy="selectin",
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="entity", cascade="all, delete-orphan"
    )

    @property
    def compatibility_tags(self) -> list[str]:
        """Was stored, and was `[archetype, role, gender]` on all 148 rows."""
        return [v for v in (self.archetype, self.role, self.gender) if v]

    def localized(self, lang: str | None = None) -> dict[str, Any]:
        """The profile in `lang`, falling back per field to the English column."""
        base = {
            "archetype": self.archetype,
            "bio": self.bio,
            "tagline": self.tagline,
            "quote": self.quote,
            "meme": self.meme,
            "turn_on": self.turn_on,
            "dealbreaker": self.dealbreaker,
            "dating_vibe": self.dating_vibe,
            "red_flags": list(self.red_flags or []),
            "green_flags": list(self.green_flags or []),
        }
        if lang and lang != "en" and isinstance(self.translations, dict):
            override = self.translations.get(lang)
            if isinstance(override, dict):
                for key in TRANSLATABLE_FIELDS:
                    value = override.get(key)
                    if value:
                        base[key] = value
        return base

    def metadata_dict(self, lang: str | None = None) -> dict[str, Any]:
        """The former `metadata_json`, rebuilt -- one spelling, no twins."""
        return {
            **self.localized(lang),
            "chapter": self.chapter,
            "danger_level": self.danger_level,
            "chaos_score": self.chaos_score,
            "compatibility_tags": self.compatibility_tags,
            "translations": self.translations or {},
        }

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        return {
            "id": self.id,
            "roster_id": self.roster_id,
            "slug": self.slug,
            "name": self.name,
            "role": self.role,
            "gender": self.gender,
            "media_url": self.media_url,
            "media_type": self.media_type,
            # One key, not two. `metadata` and `metadata_json` were the same
            # dict emitted twice in every response.
            "metadata": self.metadata_dict(lang),
            "order_index": self.order_index,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stat": self.stat.to_dict() if self.stat else None,
        }


class EntityStat(Base):
    """Vote tallies for one entity. Strictly 1:1, so `entity_id` is the key."""

    __tablename__ = "entity_stats"

    #: Was a second uuid alongside an already-`unique` `entity_id`: a surrogate
    #: key for a row that can only ever be identified by its entity.
    entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True
    )
    smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    #: Derived, but kept as columns because the leaderboard sorts and SUMs on
    #: them in SQL. `Computed(persisted=True)` is what makes that safe: the
    #: database evaluates them, so they cannot drift from the three counts the
    #: way a hand-maintained `calculate_rate()` could if any writer forgot it.
    total_votes: Mapped[int] = mapped_column(
        Integer,
        Computed("smash_count + pass_count + super_smash_count", persisted=True),
        nullable=False,
    )
    #: Deliberately unrounded and free of casts, so one expression is valid on
    #: both Postgres and SQLite; rounding is presentation and happens in
    #: `to_dict`. NULLIF/COALESCE give 0 rather than a division by zero.
    smash_rate: Mapped[float] = mapped_column(
        Float,
        Computed(
            "COALESCE((smash_count + super_smash_count) * 100.0 / "
            "NULLIF(smash_count + pass_count + super_smash_count, 0), 0)",
            persisted=True,
        ),
        nullable=False,
    )
    chaos_rating: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    entity: Mapped["Entity"] = relationship("Entity", back_populates="stat")

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes or 0,
            "smash_rate": round(self.smash_rate or 0.0, 1),
            "chaos_rating": self.chaos_rating,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        Index("idx_votes_entity_user", "entity_id", "user_id"),
        Index("idx_votes_entity_session", "entity_id", "session_id"),
        Index("idx_votes_entity_type", "entity_id", "vote_type"),
        CheckConstraint(
            "vote_type IN ('smash', 'pass', 'super_smash')", name="ck_votes_vote_type"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vote_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    entity: Mapped["Entity"] = relationship("Entity", back_populates="votes")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "vote_type": self.vote_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
