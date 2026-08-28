# backend/app/models/community.py
from datetime import datetime
from typing import TYPE_CHECKING, Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.user import User


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    goal: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "progress": self.progress,
            "goal": self.goal,
            "xp_reward": self.xp_reward,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CommunityBuild(Base):
    __tablename__ = "community_builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    character_id: Mapped[str] = mapped_column(String(100), default="all", nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Community", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "role": self.role,
            "category": self.category,
            "character_id": self.character_id,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CustomPerk(Base):
    __tablename__ = "custom_perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    character_name: Mapped[str] = mapped_column(String(100), default="Teachable", nullable=False)
    rarity: Mapped[str] = mapped_column(String(50), default="Very Rare", nullable=False)
    icon_preset: Mapped[str] = mapped_column(String(50), default="sparkles", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Community", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "character_name": self.character_name,
            "rarity": self.rarity,
            "icon_preset": self.icon_preset,
            "description": self.description,
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_name: Mapped[str] = mapped_column(String(100), nullable=False)
    reporter_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="General", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    images_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User | None"] = relationship(back_populates="bug_reports")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reporter_name": self.reporter_name,
            "reporter_email": self.reporter_email or "",
            "title": self.title,
            "category": self.category,
            "message": self.message,
            "images": safe_json_loads(self.images_json, default=[]),
            "status": self.status,
            "admin_notes": self.admin_notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
