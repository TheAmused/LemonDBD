# backend/app/models/history.py
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.challenge_mixins import RetryableRunMixin, StreakLogMixin
from app.models.base import ColumnDictMixin, JSON_LIST

if TYPE_CHECKING:
    from app.schemas.history import HistoryMatchLogDict, HistoryRunDict


class HistoryRun(RetryableRunMixin, ColumnDictMixin["HistoryRunDict"], Base):
    __tablename__ = "history_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "mode", name="uq_history_run_user_mode"),
    )
    # Checkpoint state is internal to loss handling; the API never shows it.
    _api_exclude = frozenset(
        {"checkpoint_total_killers_beaten", "checkpoint_completed_killers", "checkpoint_unlocked_perk_names"}
    )

    mode: Mapped[str] = mapped_column(String(20), nullable=False)
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

    match_logs: Mapped[list["HistoryMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="HistoryMatchLog.timestamp.asc()"
    )


class HistoryMatchLog(StreakLogMixin, ColumnDictMixin["HistoryMatchLogDict"], Base):
    __tablename__ = "history_match_logs"
    __run_table__ = "history_runs"

    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)

    run: Mapped["HistoryRun"] = relationship(back_populates="match_logs")
