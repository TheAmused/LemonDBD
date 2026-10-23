# backend/app/models/minigame.py
import uuid
from datetime import date, datetime
from typing import Any
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, JSON_DICT, JSON_LIST, utcnow


class MinigameDailyChallenge(Base, ColumnDictMixin):
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


class MinigameRepeatableChallenge(Base, ColumnDictMixin):
    """An ephemeral challenge session generated for infinite repeatable replay."""

    __tablename__ = "minigame_repeatable_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    game_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(150), default="Repeatable Challenge", nullable=False)
    rounds: Mapped[list[dict[str, Any]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)


class MinigameUserStat(Base, ColumnDictMixin):
    """User progress and streaks for minigames and daily trials."""

    __tablename__ = "minigame_user_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "game_mode", name="uq_minigame_user_mode_stat"),
    )

    _api_exclude = frozenset({"id", "updated_at"})

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
