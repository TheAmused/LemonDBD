# backend/app/models/page_streak.py
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads
from app.models.base import utcnow


class PageStreakRun(Base):
    __tablename__ = "page_streak_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "killer", name="uq_page_streak_run_user_killer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    killer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_page: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    best_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pages_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    page_logs: Mapped[list["PageStreakPageLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="PageStreakPageLog.timestamp.asc()"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "killer": self.killer,
            "status": self.status,
            "attempt": self.attempt,
            "current_page": self.current_page,
            "best_page": self.best_page,
            "pages_json": self.pages_json,
            "pages": safe_json_loads(self.pages_json, default=[]),
            "snapshot_at": self.snapshot_at.isoformat() if self.snapshot_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PageStreakPageLog(Base):
    __tablename__ = "page_streak_page_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("page_streak_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "attempt": self.attempt,
            "page_number": self.page_number,
            "perks_json": self.perks_json,
            "perks": safe_json_loads(self.perks_json, default=[]),
            "result": self.result,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
