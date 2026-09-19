# backend/app/models/chaos.py
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.challenge_mixins import StreakLogMixin, StreakRunMixin
from app.models.base import ColumnDictMixin, JSON_LIST

if TYPE_CHECKING:
    from app.schemas.chaos import ChaosMatchLogDict, ChaosRunDict


class ChaosRun(StreakRunMixin, ColumnDictMixin["ChaosRunDict"], Base):
    __tablename__ = "chaos_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "difficulty", name="uq_chaos_run_user_difficulty"),
    )

    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    completed_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_killers: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    used_perks: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_used_perks: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_addon_rarities: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    owned_killer_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    unlocked_perk_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    perks_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    match_logs: Mapped[list["ChaosMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="ChaosMatchLog.timestamp.asc()"
    )


class ChaosMatchLog(StreakLogMixin, ColumnDictMixin["ChaosMatchLogDict"], Base):
    __tablename__ = "chaos_match_logs"
    __run_table__ = "chaos_runs"

    killer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)
    addon_rarities: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)

    run: Mapped["ChaosRun"] = relationship(back_populates="match_logs")
