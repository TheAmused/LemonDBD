# backend/app/models/history.py
import json
from datetime import datetime
from typing import List
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class HistoryRun(Base):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    mode: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    current_row_index: Mapped[int] = mapped_column(Integer, default=0)
    total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    best_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_row_index: Mapped[int] = mapped_column(Integer, default=0)
    checkpoint_total_killers_beaten: Mapped[int] = mapped_column(Integer, default=0)
    checkpoint_completed_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    checkpoint_unlocked_perk_names_json: Mapped[str] = mapped_column(Text, default="[]")
    owned_killers_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    match_logs: Mapped[List["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "current_row_index": self.current_row_index,
            "total_killers_beaten": self.total_killers_beaten,
            "best_killers_beaten": self.best_killers_beaten,
            "completed_killers": json.loads(self.completed_killers_json or "[]"),
            "unlocked_perk_names": json.loads(self.unlocked_perk_names_json or "[]"),
            "owned_killer_ids": json.loads(self.owned_killers_json or "[]"),
            "checkpoint_row_index": self.checkpoint_row_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class HistoryMatchLog(Base):
    __tablename__ = "history_match_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("history_runs.id", ondelete="CASCADE"), index=True
    )
    killer_id: Mapped[str] = mapped_column(String(100))
    result: Mapped[str] = mapped_column(String(20))
    row_index: Mapped[int] = mapped_column(Integer)
    streak_before: Mapped[int] = mapped_column(Integer)
    streak_after: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    triggered_by: Mapped[str] = mapped_column(String(20), default="player")

    run: Mapped["HistoryRun"] = relationship(back_populates="match_logs")

    def to_dict(self) -> dict:
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
