# backend/app/models/minigames.py
import json
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class GeneratorSetting(Base):
    __tablename__ = "generator_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="Survivor")
    gen_mode: Mapped[str] = mapped_column(String(20), default="instant")
    no_repeat_perks: Mapped[bool] = mapped_column(Boolean, default=True)
    total_pages: Mapped[int] = mapped_column(Integer, default=12)
    perks_per_page: Mapped[int] = mapped_column(Integer, default=15)
    last_page_perks: Mapped[int] = mapped_column(Integer, default=8)
    spin_duration_sec: Mapped[float] = mapped_column(Float, default=3.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "gen_mode": self.gen_mode,
            "no_repeat_perks": 1 if self.no_repeat_perks else 0,
            "total_pages": self.total_pages,
            "perks_per_page": self.perks_per_page,
            "last_page_perks": self.last_page_perks,
            "spin_duration_sec": self.spin_duration_sec,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class GeneratorDrawnPerk(Base):
    __tablename__ = "generator_drawn_perks"
    __table_args__ = (
        UniqueConstraint("role", "perk_name", name="uq_drawn_role_perk"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20))
    perk_name: Mapped[str] = mapped_column(String(150))
    drawn_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "perk_name": self.perk_name,
            "drawn_at": self.drawn_at.isoformat() if self.drawn_at else None,
        }


class DraftSession(Base):
    __tablename__ = "draft_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    phase: Mapped[str] = mapped_column(String(20), default="bans")
    banned_perks: Mapped[str] = mapped_column(Text, default="[]")
    picked_survivor_perks: Mapped[str] = mapped_column(Text, default="[]")
    picked_killer_perks: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "room_code": self.room_code,
            "phase": self.phase,
            "banned_perks": json.loads(self.banned_perks or "[]"),
            "picked_survivor_perks": json.loads(
                self.picked_survivor_perks or "[]"
            ),
            "picked_killer_perks": json.loads(self.picked_killer_perks or "[]"),
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class GuesserStat(Base):
    __tablename__ = "guesser_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    guesser_type: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    total_guesses: Mapped[int] = mapped_column(Integer, default=0)
    correct_guesses: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "guesser_type": self.guesser_type,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "total_guesses": self.total_guesses,
            "correct_guesses": self.correct_guesses,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }

