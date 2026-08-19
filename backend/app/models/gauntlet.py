import json
from datetime import datetime
from typing import List
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class GauntletRun(Base):
    __tablename__ = "gauntlet_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_gauntlet_run_user_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_character_id: Mapped[str] = mapped_column(String(100))
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0)
    completed_characters_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_characters_json: Mapped[str] = mapped_column(Text, default="[]")
    current_loadout_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["GauntletMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    match_exceptions: Mapped[List["GauntletMatchException"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "status": self.status,
            "current_character_id": self.current_character_id,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_characters_json": self.completed_characters_json,
            "checkpoint_characters_json": self.checkpoint_characters_json,
            "current_loadout_json": self.current_loadout_json,
            "completed_characters": json.loads(
                self.completed_characters_json or "[]"
            ),
            "checkpoint_characters": json.loads(
                self.checkpoint_characters_json or "[]"
            ),
            "current_loadout": json.loads(self.current_loadout_json or "{}"),
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class GauntletMatchLog(Base):
    __tablename__ = "gauntlet_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("gauntlet_runs.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    character_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    perks_json: Mapped[str] = mapped_column(Text)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["GauntletRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "role": self.role,
            "character_id": self.character_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat()
            if self.timestamp
            else None,
        }


class GauntletMatchException(Base):
    __tablename__ = "gauntlet_match_exceptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("gauntlet_runs.id", ondelete="CASCADE"), index=True
    )
    character_id: Mapped[str] = mapped_column(String(100))
    reason: Mapped[str] = mapped_column(String(50))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["GauntletRun"] = relationship(back_populates="match_exceptions")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "character_id": self.character_id,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat()
            if self.timestamp
            else None,
        }

