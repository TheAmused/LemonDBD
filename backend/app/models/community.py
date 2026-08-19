# backend/app/models/community.py
import json
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.user import User


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(20))
    progress: Mapped[int] = mapped_column(Integer, default=0)
    goal: Mapped[int] = mapped_column(Integer, default=1)
    xp_reward: Mapped[int] = mapped_column(Integer, default=500)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "progress": self.progress,
            "goal": self.goal,
            "xp_reward": self.xp_reward,
            "is_completed": self.is_completed,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
        }


class CommunityBuild(Base):
    __tablename__ = "community_builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(50))
    character_id: Mapped[str] = mapped_column(String(100), default="all")
    perks_json: Mapped[str] = mapped_column(Text, default="[]")
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    author: Mapped[str] = mapped_column(String(100), default="Community")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "role": self.role,
            "category": self.category,
            "character_id": self.character_id,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "upvotes": self.upvotes,
            "author": self.author,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
        }


class CustomPerk(Base):
    __tablename__ = "custom_perks"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(20))
    character_name: Mapped[str] = mapped_column(
        String(100), default="Teachable"
    )
    rarity: Mapped[str] = mapped_column(String(50))
    icon_preset: Mapped[str] = mapped_column(String(50), default="sparkles")
    description: Mapped[str] = mapped_column(Text)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    author: Mapped[str] = mapped_column(String(100), default="Community")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
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
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
        }


class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_name: Mapped[str] = mapped_column(String(100))
    reporter_email: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), default="General")
    message: Mapped[str] = mapped_column(Text)
    images_json: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String(30), default="pending")
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="bug_reports")

    def to_dict(self) -> dict:
        images = []
        if self.images_json:
            try:
                images = json.loads(self.images_json)
            except Exception:
                images = []
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reporter_name": self.reporter_name,
            "reporter_email": self.reporter_email or "",
            "title": self.title,
            "category": self.category,
            "message": self.message,
            "images": images,
            "status": self.status,
            "admin_notes": self.admin_notes or "",
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }

