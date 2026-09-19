# backend/app/models/page_streak.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.challenge_mixins import ChallengeRunMixin, MatchLogMixin
from app.models.base import ColumnDictMixin, JSON_LIST, utcnow

if TYPE_CHECKING:
    from app.schemas.page_streak import PageStreakPageLogDict


class PageStreakRun(ChallengeRunMixin, Base):
    __tablename__ = "page_streak_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "killer", name="uq_page_streak_run_user_killer"),
    )

    killer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    attempt: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_page: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    best_page: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pages: Mapped[list[list[str]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    page_logs: Mapped[list["PageStreakPageLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="PageStreakPageLog.timestamp.asc()"
    )


class PageStreakPageLog(MatchLogMixin, ColumnDictMixin["PageStreakPageLogDict"], Base):
    __tablename__ = "page_streak_page_logs"
    __run_table__ = "page_streak_runs"

    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    perks: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)

    run: Mapped["PageStreakRun"] = relationship(back_populates="page_logs")
