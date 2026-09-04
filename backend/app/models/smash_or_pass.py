# backend/app/models/smash_or_pass.py
import uuid
from datetime import datetime
from typing import Any
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


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

    entities: Mapped[list["Entity"]] = relationship(
        "Entity",
        back_populates="roster",
        cascade="all, delete-orphan",
        order_by="Entity.order_index",
        lazy="selectin",
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
    __tablename__ = "entities"

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
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    roster: Mapped["Roster"] = relationship("Roster", back_populates="entities")
    stat: Mapped["EntityStat | None"] = relationship(
        "EntityStat", back_populates="entity", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="entity", cascade="all, delete-orphan"
    )

    def get_metadata(self) -> dict[str, Any]:
        if isinstance(self.metadata_json, dict):
            return self.metadata_json
        if isinstance(self.metadata_json, str):
            return safe_json_loads(self.metadata_json, default={})
        return {}

    def set_metadata(self, value: Any) -> None:
        self.metadata_json = value

    def to_dict(self) -> dict[str, Any]:
        meta = self.get_metadata()
        return {
            "id": self.id,
            "roster_id": self.roster_id,
            "slug": self.slug,
            "name": self.name,
            "role": self.role,
            "gender": self.gender,
            "media_url": self.media_url,
            "media_type": self.media_type,
            "metadata": meta,
            "metadata_json": meta,
            "order_index": self.order_index,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stat": self.stat.to_dict() if self.stat else None,
        }


class EntityStat(Base):
    __tablename__ = "entity_stats"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entities.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    smash_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    chaos_rating: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    entity: Mapped["Entity"] = relationship("Entity", back_populates="stat")

    def calculate_rate(self) -> float:
        smash = self.smash_count if self.smash_count is not None else 0
        p = self.pass_count if self.pass_count is not None else 0
        super_smash = self.super_smash_count if self.super_smash_count is not None else 0
        total = smash + p + super_smash
        self.total_votes = total
        if total == 0:
            self.smash_rate = 0.0
        else:
            positive_votes = smash + super_smash
            self.smash_rate = round((positive_votes / total) * 100.0, 1)
        return self.smash_rate

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes,
            "smash_rate": self.smash_rate,
            "chaos_rating": self.chaos_rating,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (
        Index("idx_votes_entity_user", "entity_id", "user_id"),
        Index("idx_votes_entity_session", "entity_id", "session_id"),
        Index("idx_votes_entity_type", "entity_id", "vote_type"),
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


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    locale: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    key: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, str | None]:
        return {
            "id": self.id,
            "locale": self.locale,
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SmashPassStat(Base):
    __tablename__ = "smash_pass_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    character_name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="Survivor", nullable=False)
    gender: Mapped[str] = mapped_column(String(20), default="female", nullable=False)
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True, nullable=False)
    smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    super_smash_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    smash_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def calculate_rate(self) -> float:
        smash = self.smash_count if self.smash_count is not None else 0
        p = self.pass_count if self.pass_count is not None else 0
        super_smash = self.super_smash_count if self.super_smash_count is not None else 0
        total = smash + p + super_smash
        self.total_votes = total
        if total == 0:
            self.smash_rate = 0.0
        else:
            positive_votes = smash + super_smash
            self.smash_rate = round((positive_votes / total) * 100.0, 1)
        return self.smash_rate

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "character_name": self.character_name,
            "role": self.role,
            "gender": self.gender,
            "edition": self.edition,
            "smash_count": self.smash_count,
            "pass_count": self.pass_count,
            "super_smash_count": self.super_smash_count,
            "total_votes": self.total_votes,
            "smash_rate": self.smash_rate,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SmashPassVote(Base):
    __tablename__ = "smash_pass_votes"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vote_type: Mapped[str] = mapped_column(String(20), nullable=False)
    edition: Mapped[str] = mapped_column(String(50), default="canon", index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "character_slug": self.character_slug,
            "vote_type": self.vote_type,
            "edition": self.edition,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
