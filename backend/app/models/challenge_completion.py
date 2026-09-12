# backend/app/models/challenge_completion.py
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class ChallengeCompletionRecord(Base):
    """A permanent snapshot taken each time a gauntlet/chaos/history run is
    fully completed, so a player can look back at past wins after the run
    itself resets and its in-progress state (including match logs) is gone."""

    __tablename__ = "challenge_completion_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    variant: Mapped[str] = mapped_column(String(30), nullable=False)
    attempts_taken: Mapped[int] = mapped_column(Integer, nullable=False)
    unlocked_characters_count: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "mode": self.mode,
            "variant": self.variant,
            "attempts_taken": self.attempts_taken,
            "unlocked_characters_count": self.unlocked_characters_count,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
