# backend/app/models/challenge_completion.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, utcnow

if TYPE_CHECKING:
    from app.schemas.streak import ChallengeCompletionDict  # noqa: F401 -- named in the ColumnDictMixin["..."] string generic


class ChallengeCompletionRecord(Base, ColumnDictMixin["ChallengeCompletionDict"]):
    """A permanent snapshot taken each time a gauntlet/chaos/history run is
    fully completed, so a player can look back at past wins after the run
    itself resets and its in-progress state (including match logs) is gone.

    Page Streak writes one record per killer cleared, carrying how many pages
    of perks the run was played on (`pages_count`: the pool grows as perks are
    unlocked, so a later clear may be on more pages). Its mode-wide badge is
    not stored; it is computed live, see
    app.services.page_streak.roster.get_live_roster_badge.

    ID, Please writes here too, but its runs never complete: a record is its
    one-time badge for a difficulty (variant milestones / hardcore /
    hardcore_plus), written when the streak first reaches that difficulty's
    threshold while the run carries on."""

    __tablename__ = "challenge_completion_records"
    _api_exclude = frozenset({"user_id"})

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    variant: Mapped[str] = mapped_column(String(30), nullable=False)
    attempts_taken: Mapped[int] = mapped_column(Integer, nullable=False)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False)
    unlocked_characters_count: Mapped[int] = mapped_column(Integer, nullable=False)
    # Whether this run's frozen owned-character pool was, at completion time,
    # every (role- and roster-limit-bounded) character in the game -- see
    # app.services.roster_milestone.get_full_roster_milestone.
    full_roster: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Page Streak only: the pages of perks the cleared run had. None elsewhere and on records from before it was kept.
    pages_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
