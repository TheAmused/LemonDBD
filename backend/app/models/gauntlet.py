# backend/app/models/gauntlet.py
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.challenge_mixins import StreakLogMixin, StreakRunMixin
from app.models.base import ColumnDictMixin, JSON_DICT, JSON_LIST
from app.schemas.gauntlet import GauntletLoadout

if TYPE_CHECKING:
    from app.schemas.gauntlet import GauntletMatchLogDict, GauntletRunDict


class GauntletRun(StreakRunMixin, ColumnDictMixin["GauntletRunDict"], Base):
    __tablename__ = "gauntlet_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "role", "game_mode", name="uq_gauntlet_run_user_role_mode"),
    )

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    game_mode: Mapped[str] = mapped_column(String(20), default="original", nullable=False)
    target_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    completed_characters: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    checkpoint_characters: Mapped[list[str]] = mapped_column(JSON_LIST, default=list, nullable=False)
    current_loadout: Mapped[GauntletLoadout] = mapped_column(JSON_DICT, default=dict, nullable=False)
    owned_character_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)

    match_logs: Mapped[list["GauntletMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="GauntletMatchLog.timestamp.asc()"
    )


class GauntletMatchLog(StreakLogMixin, ColumnDictMixin["GauntletMatchLogDict"], Base):
    __tablename__ = "gauntlet_match_logs"
    __run_table__ = "gauntlet_runs"

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    character_id: Mapped[str] = mapped_column(String(100), nullable=False)
    perks: Mapped[list[dict[str, object]]] = mapped_column(JSON_LIST, default=list, nullable=False)

    run: Mapped["GauntletRun"] = relationship(back_populates="match_logs")
