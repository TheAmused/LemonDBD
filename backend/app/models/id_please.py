# backend/app/models/id_please.py
from typing import TYPE_CHECKING, Any
from sqlalchemy import Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import JSON_DICT, JSON_LIST, ColumnDictMixin
from app.models.challenge_mixins import StreakLogMixin, StreakRunMixin

if TYPE_CHECKING:
    from app.schemas.id_please import IdPleaseMatchLogDict, IdPleaseRunDict  # noqa: F401 -- named in the ColumnDictMixin["..."] string generic


class IdPleaseRun(StreakRunMixin, ColumnDictMixin["IdPleaseRunDict"], Base):
    """One player's endless run of a difficulty in one lane (mixed, survivor or killer).

    Only the match in play (and the one before it) is stored, as database ids; the next match is worked out
    from the player's live lists when a result comes in. `current_match` is 0 while the run is in setup.
    """

    __tablename__ = "id_please_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "lane", "difficulty", name="uq_id_please_run_user_lane_difficulty"),
    )
    _api_exclude = frozenset({"perk_seed"})        # the order is the secret of Hardcore+

    #: "mixed" (the side changes every match), "survivor" or "killer" (one side throughout).
    lane: Mapped[str] = mapped_column(String(10), default="mixed", server_default="mixed", nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    #: Version of the formula the run was started with; a future change to it must not rewrite runs in play.
    algo_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    opening_side: Mapped[str] = mapped_column(String(10), default="", server_default="", nullable=False)
    opening_perk_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    #: Hardcore+: the hidden shuffle of the player's perks, drawn again at every opening (0 = the plain order). It
    #: decides which position each perk has in the chain, so the same four perks never give the same chain twice.
    perk_seed: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    #: Number of the match in play (the streak of this attempt plus one); 0 while the run is in setup.
    current_match: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    #: `{"number", "side", "character_id", "perk_ids"}`; empty in setup.
    current_loadout: Mapped[dict[str, Any]] = mapped_column(JSON_DICT, default=dict, nullable=False)
    #: The match before the current one (the same side as the next), which Hardcore+ mixes in.
    before_loadout: Mapped[dict[str, Any]] = mapped_column(JSON_DICT, default=dict, nullable=False)
    #: Memory: `{"killer": [ids], "survivor": [ids]}` of characters played this round (mixed Hardcore and Hardcore+)
    #: or this attempt (a single-side lane that has not earned its badge yet). Empty when nothing is remembered.
    used_character_ids: Mapped[dict[str, Any]] = mapped_column(JSON_DICT, default=dict, nullable=False)
    #: Milestones: the match to come back to after a loss, with the memory as it stood then under "used".
    checkpoint_loadout: Mapped[dict[str, Any]] = mapped_column(JSON_DICT, default=dict, nullable=False)

    match_logs: Mapped[list["IdPleaseMatchLog"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="IdPleaseMatchLog.timestamp.asc()"
    )


class IdPleaseMatchLog(StreakLogMixin, ColumnDictMixin["IdPleaseMatchLogDict"], Base):
    __tablename__ = "id_please_match_logs"
    __run_table__ = "id_please_runs"

    match_number: Mapped[int] = mapped_column(Integer, nullable=False)
    side: Mapped[str] = mapped_column(String(10), nullable=False)
    character_id: Mapped[int] = mapped_column(Integer, nullable=False)
    perk_ids: Mapped[list[int]] = mapped_column(JSON_LIST, default=list, nullable=False)
    #: Sizes and checksum of the player's lists when the match was played; only ever compared.
    roster_fingerprint: Mapped[str] = mapped_column(String(64), default="", nullable=False)

    run: Mapped["IdPleaseRun"] = relationship(back_populates="match_logs")
