# backend/app/models/chaos.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, JSON_LIST, utcnow

if TYPE_CHECKING:
    from app.schemas.chaos import ChaosMatchLogDict, ChaosRunDict


class ChaosRun(Base, ColumnDictMixin["ChaosRunDict"]):
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
    completed_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    used_perks: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_used_perks: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_addon_rarities: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    owned_killer_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    unlocked_perk_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
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


class ChaosMatchLog(Base, ColumnDictMixin["ChaosMatchLogDict"]):
    __tablename__ = "chaos_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("chaos_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    addon_rarities: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")
