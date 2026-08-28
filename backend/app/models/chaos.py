# backend/app/models/chaos.py
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class ChaosRun(Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    used_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_used_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    current_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    current_addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    unlocked_perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ChaosMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "difficulty": self.difficulty,
            "status": self.status,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_killers_json": self.completed_killers_json,
            "completed_killers": safe_json_loads(self.completed_killers_json, default=[]),
            "checkpoint_killers_json": self.checkpoint_killers_json,
            "checkpoint_killers": safe_json_loads(self.checkpoint_killers_json, default=[]),
            "used_perks_json": self.used_perks_json,
            "used_perks": safe_json_loads(self.used_perks_json, default=[]),
            "checkpoint_used_perks_json": self.checkpoint_used_perks_json,
            "checkpoint_used_perks": safe_json_loads(self.checkpoint_used_perks_json, default=[]),
            "current_perks_json": self.current_perks_json,
            "current_perks": safe_json_loads(self.current_perks_json, default=[]),
            "current_addon_rarities_json": self.current_addon_rarities_json,
            "current_addon_rarities": safe_json_loads(self.current_addon_rarities_json, default=[]),
            "owned_killer_ids": safe_json_loads(self.owned_killers_json, default=[]),
            "unlocked_perk_ids": safe_json_loads(self.unlocked_perks_json, default=[]),
            "perks_revealed": self.perks_revealed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChaosMatchLog(Base):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("chaos_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    addon_rarities_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "addon_rarities_json": self.addon_rarities_json,
            "addon_rarities": safe_json_loads(self.addon_rarities_json, default=[]),
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
