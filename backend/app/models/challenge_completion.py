# backend/app/models/challenge_completion.py
from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class ChallengeCompletionRecord(Base):
    """A permanent snapshot taken each time a gauntlet/chaos/history run is
    fully completed, so a player can look back at past wins after the run
    itself resets and its in-progress state (including match logs) is gone.

    Page Streak does NOT write here for its mode-wide badge -- unlike these
    three, it has no bounded run to freeze a pool against (the roster keeps
    growing), so that badge is computed live instead; see
    app.services.page_streak.roster.get_live_roster_badge."""

    __tablename__ = "challenge_completion_records"

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
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "mode": self.mode,
            "variant": self.variant,
            "attempts_taken": self.attempts_taken,
            "matches_played": self.matches_played,
            "unlocked_characters_count": self.unlocked_characters_count,
            "full_roster": self.full_roster,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
