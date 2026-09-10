# backend/app/models/minigames.py
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class DraftSession(Base):
    __tablename__ = "draft_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    phase: Mapped[str] = mapped_column(String(20), default="bans", nullable=False)
    banned_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    picked_survivor_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    picked_killer_perks: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "room_code": self.room_code,
            "phase": self.phase,
            "banned_perks": safe_json_loads(self.banned_perks, default=[]),
            "picked_survivor_perks": safe_json_loads(self.picked_survivor_perks, default=[]),
            "picked_killer_perks": safe_json_loads(self.picked_killer_perks, default=[]),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GuesserStat(Base):
    __tablename__ = "guesser_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    guesser_type: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_guesses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_guesses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "guesser_type": self.guesser_type,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "total_guesses": self.total_guesses,
            "correct_guesses": self.correct_guesses,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ScraperSetting(Base):
    __tablename__ = "scraper_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(50), default="wikigg", nullable=False)
    fallback_to_wiki: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_used_source: Mapped[str] = mapped_column(String(50), default="wikigg", nullable=False)
    last_run_timestamp: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "fallback_to_wiki": self.fallback_to_wiki,
            "last_used_source": self.last_used_source,
            "last_run_timestamp": self.last_run_timestamp,
        }
