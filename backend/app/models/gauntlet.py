# backend/app/models/gauntlet.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JSON_DICT, JSON_LIST, utcnow
from app.schemas.gauntlet import GauntletLoadout

if TYPE_CHECKING:
    from app.schemas.gauntlet import GauntletMatchLogDict, GauntletRunDict


class GauntletRun(Base):
    __tablename__ = "gauntlet_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "role", "game_mode", name="uq_gauntlet_run_user_role_mode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    game_mode: Mapped[str] = mapped_column(String(20), default="original", nullable=False)
    target_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_checkpoint_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_characters: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_characters: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_loadout: Mapped[GauntletLoadout] = mapped_column(JSON_DICT, default=dict, nullable=False)
    owned_character_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["GauntletMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="GauntletMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> "GauntletRunDict":
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "status": self.status,
            "game_mode": self.game_mode,
            "target_revealed": self.target_revealed,
            "current_character_id": self.current_character_id,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "last_checkpoint_streak": self.last_checkpoint_streak,
            "completed_characters": self.completed_characters,
            "checkpoint_characters": self.checkpoint_characters,
            "current_loadout": self.current_loadout,
            "owned_character_ids": self.owned_character_ids,
            "attempts": self.attempts,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class GauntletMatchLog(Base):
    __tablename__ = "gauntlet_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("gauntlet_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["GauntletRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> "GauntletMatchLogDict":
        return {
            "id": self.id,
            "run_id": self.run_id,
            "role": self.role,
            "character_id": self.character_id,
            "result": self.result,
            "perks": self.perks,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
