# backend/app/models/challenge_mixins.py
"""Columns shared by the challenge run and match log tables. `sort_order`
keeps `id` and the foreign key first in a newly created table."""
from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.models.base import utcnow


class ChallengeRunMixin:
    """One player's run in a challenge mode: gauntlet, chaos, history, page streak."""

    id: Mapped[int] = mapped_column(primary_key=True, sort_order=-2)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, sort_order=-1
    )
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class RetryableRunMixin(ChallengeRunMixin):
    """A run that counts its failed attempts until completion (page streak numbers its own)."""

    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class StreakRunMixin(RetryableRunMixin):
    """A win streak with checkpoints: gauntlet and chaos."""

    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class MatchLogMixin:
    """One recorded match of a run; `__run_table__` names the run table it belongs to."""

    __run_table__: ClassVar[str]

    id: Mapped[int] = mapped_column(primary_key=True, sort_order=-2)

    @declared_attr
    def run_id(cls) -> Mapped[int]:
        return mapped_column(
            ForeignKey(f"{cls.__run_table__}.id", ondelete="CASCADE"), nullable=False, index=True, sort_order=-1
        )

    result: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)


class StreakLogMixin(MatchLogMixin):
    """A match that moved a streak counter: gauntlet, chaos, history."""

    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
