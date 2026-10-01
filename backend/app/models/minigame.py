# backend/app/models/minigame.py
import uuid
from datetime import date, datetime
from typing import Any
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JSON_DICT, JSON_LIST, utcnow


class MinigameDailyChallenge(Base):
    """An official daily challenge seeded or authored for a specific calendar date."""

    __tablename__ = "minigame_daily_challenges"
    __table_args__ = (
        UniqueConstraint("challenge_date", "game_mode", name="uq_minigame_daily_date_mode"),
        Index("ix_minigame_daily_date_active", "challenge_date", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    challenge_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    rounds: Mapped[list[dict[str, Any]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "challenge_date": self.challenge_date.isoformat() if self.challenge_date else None,
            "game_mode": self.game_mode,
            "title": self.title,
            "description": self.description,
            "rounds": self.rounds,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MinigameRepeatableChallenge(Base):
    """An ephemeral challenge session generated for infinite repeatable replay."""

    __tablename__ = "minigame_repeatable_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(150), default="Repeatable Challenge", nullable=False)
    rounds: Mapped[list[dict[str, Any]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "game_mode": self.game_mode,
            "title": self.title,
            "rounds": self.rounds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class MinigameUserStat(Base):
    """User progress and streaks for minigames and daily trials."""

    __tablename__ = "minigame_user_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "game_mode", name="uq_minigame_user_mode_stat"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_played: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guess_distribution: Mapped[dict[str, int]] = mapped_column(JSON_DICT, default=dict, nullable=False)
    last_played_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "game_mode": self.game_mode,
            "current_streak": self.current_streak,
            "max_streak": self.max_streak,
            "total_played": self.total_played,
            "total_won": self.total_won,
            "guess_distribution": self.guess_distribution or {},
            "last_played_date": self.last_played_date.isoformat() if self.last_played_date else None,
        }
