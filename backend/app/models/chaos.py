# backend/app/models/chaos.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JsonField, utcnow

if TYPE_CHECKING:
    from app.schemas.chaos import ChaosMatchLogDict, ChaosRunDict
    from app.schemas.streak import PerkPayload


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
    completed_killers = JsonField[list[str]]("completed_killers_json", list)
    checkpoint_killers = JsonField[list[str]]("checkpoint_killers_json", list)
    used_perks = JsonField[list[str]]("used_perks_json", list)
    checkpoint_used_perks = JsonField[list[str]]("checkpoint_used_perks_json", list)
    current_perks = JsonField["list[PerkPayload]"]("current_perks_json", list)
    current_addon_rarities = JsonField[list[str]]("current_addon_rarities_json", list)
    owned_killer_ids = JsonField[list[int]]("owned_killers_json", list)
    unlocked_perk_ids = JsonField[list[int]]("unlocked_perks_json", list)
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ChaosMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> "ChaosRunDict":
        return {
            "id": self.id,
            "user_id": self.user_id,
            "difficulty": self.difficulty,
            "status": self.status,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_killers": self.completed_killers,
            "checkpoint_killers": self.checkpoint_killers,
            "used_perks": self.used_perks,
            "checkpoint_used_perks": self.checkpoint_used_perks,
            "current_perks": self.current_perks,
            "current_addon_rarities": self.current_addon_rarities,
            "owned_killer_ids": self.owned_killer_ids,
            "unlocked_perk_ids": self.unlocked_perk_ids,
            "perks_revealed": self.perks_revealed,
            "attempts": self.attempts,
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
    perks = JsonField["list[PerkPayload]"]("perks_json", list)
    addon_rarities = JsonField[list[str]]("addon_rarities_json", list)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> "ChaosMatchLogDict":
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "perks": self.perks,
            "addon_rarities": self.addon_rarities,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
