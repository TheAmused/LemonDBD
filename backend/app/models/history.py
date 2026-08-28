# backend/app/models/history.py
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class HistoryRun(Base):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
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
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checkpoint_completed_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    checkpoint_unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    match_logs: Mapped[list["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="HistoryMatchLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "current_row_index": self.current_row_index,
            "total_killers_beaten": self.total_killers_beaten,
            "best_killers_beaten": self.best_killers_beaten,
            "completed_killers": safe_json_loads(self.completed_killers_json, default=[]),
            "unlocked_perk_names": safe_json_loads(self.unlocked_perk_names_json, default=[]),
            "owned_killer_ids": safe_json_loads(self.owned_killers_json, default=[]),
            "checkpoint_row_index": self.checkpoint_row_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class HistoryMatchLog(Base):
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

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "killer_id": self.killer_id,
            "result": self.result,
            "row_index": self.row_index,
            "streak_before": self.streak_before,
            "streak_after": self.streak_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
