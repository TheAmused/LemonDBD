# backend/app/models/chaos.py
import json
from datetime import datetime
from typing import List
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class ChaosRun(Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    difficulty: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_used_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_perks_json: Mapped[str] = mapped_column(Text, default="[]")
    current_addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]")
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "difficulty": self.difficulty,
            "status": self.status,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_killers_json": self.completed_killers_json,
            "completed_killers": json.loads(self.completed_killers_json or "[]"),
            "checkpoint_killers_json": self.checkpoint_killers_json,
            "checkpoint_killers": json.loads(self.checkpoint_killers_json or "[]"),
            "used_perks_json": self.used_perks_json,
            "used_perks": json.loads(self.used_perks_json or "[]"),
            "checkpoint_used_perks_json": self.checkpoint_used_perks_json,
            "checkpoint_used_perks": json.loads(self.checkpoint_used_perks_json or "[]"),
            "current_perks_json": self.current_perks_json,
            "current_perks": json.loads(self.current_perks_json or "[]"),
            "current_addon_rarities_json": self.current_addon_rarities_json,
            "current_addon_rarities": json.loads(self.current_addon_rarities_json or "[]"),
            "perks_revealed": self.perks_revealed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChaosMatchLog(Base):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("chaos_runs.id", ondelete="CASCADE"), index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    perks_json: Mapped[str] = mapped_column(Text)
    addon_rarities_json: Mapped[str] = mapped_column(Text)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "addon_rarities_json": self.addon_rarities_json,
            "addon_rarities": json.loads(self.addon_rarities_json or "[]"),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
