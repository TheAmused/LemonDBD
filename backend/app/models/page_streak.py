# backend/app/models/page_streak.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JsonField, utcnow

if TYPE_CHECKING:
    from app.schemas.page_streak import PageStreakPageLogDict


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
    pages = JsonField[list[list[str]]]("pages_json", list)
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


class PageStreakPageLog(Base):
    __tablename__ = "page_streak_page_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("page_streak_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    perks_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    perks = JsonField[list[str]]("perks_json", list)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="player", nullable=False)

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")

    def to_dict(self) -> "PageStreakPageLogDict":
        return {
            "id": self.id,
            "run_id": self.run_id,
            "attempt": self.attempt,
            "page_number": self.page_number,
            "perks": self.perks,
            "result": self.result,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "triggered_by": self.triggered_by,
        }
