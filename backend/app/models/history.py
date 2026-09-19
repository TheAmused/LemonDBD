# backend/app/models/history.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, JSON_LIST, utcnow

if TYPE_CHECKING:
    from app.schemas.history import HistoryMatchLogDict, HistoryRunDict


class HistoryRun(Base, ColumnDictMixin["HistoryRunDict"]):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
    )
    # Checkpoint state is internal to loss handling; the API never shows it.
    _api_exclude = frozenset(
        {"checkpoint_total_killers_beaten", "checkpoint_completed_killers", "checkpoint_unlocked_perk_names"}
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    current_row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    unlocked_perk_names: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_completed_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_unlocked_perk_names: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    owned_killer_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="HistoryMatchLog.timestamp.asc()"
    )


class HistoryMatchLog(Base, ColumnDictMixin["HistoryMatchLogDict"]):
    __tablename__ = "history_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("history_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_before: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_after: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["HistoryRun"] = relationship(back_populates="match_logs")
