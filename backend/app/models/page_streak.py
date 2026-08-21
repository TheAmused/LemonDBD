# backend/app/models/page_streak.py
import json
from datetime import datetime
from typing import List
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class PageStreakRun(Base):
    __tablename__ = "page_streak_runs"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "killer", name="uq_page_streak_run_user_killer"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    killer: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    current_page: Mapped[int] = mapped_column(Integer, default=1)
    best_page: Mapped[int] = mapped_column(Integer, default=0)
    pages_json: Mapped[str] = mapped_column(Text, default="[]")
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    page_logs: Mapped[List["PageStreakPageLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "killer": self.killer,
            "status": self.status,
            "attempt": self.attempt,
            "current_page": self.current_page,
            "best_page": self.best_page,
            "pages_json": self.pages_json,
            "pages": json.loads(self.pages_json or "[]"),
            "snapshot_at": self.snapshot_at.isoformat()
            if self.snapshot_at
            else None,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class PageStreakPageLog(Base):
    __tablename__ = "page_streak_page_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("page_streak_runs.id", ondelete="CASCADE"), index=True
    )
    attempt: Mapped[int] = mapped_column(Integer)
    page_number: Mapped[int] = mapped_column(Integer)
    perks_json: Mapped[str] = mapped_column(Text)
    result: Mapped[str] = mapped_column(String(20))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    triggered_by: Mapped[str] = mapped_column(String(20), default="player")

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "attempt": self.attempt,
            "page_number": self.page_number,
            "perks_json": self.perks_json,
            "perks": json.loads(self.perks_json or "[]"),
            "result": self.result,
            "timestamp": self.timestamp.isoformat()
            if self.timestamp
            else None,
            "triggered_by": self.triggered_by,
        }

