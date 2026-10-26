# backend/app/models/user_preference.py
"""User preference model for site-wide audio, visual, and content settings."""
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.extensions import Base
from app.models.base import utcnow


class UserPreference(Base):
    """Stores user preferences for audio, visual effects, and content filtering.

    One row per user, keyed by `user_id` with cascading delete on user removal.
    `chosen_at` is client timestamp (epoch milliseconds) used for conflict resolution
    between signed-out and signed-in preferences.
    """

    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    effects_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sounds_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    music_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    nsfw_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    background_animation: Mapped[str] = mapped_column(String(16), default="on", nullable=False)
    chosen_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "effects": self.effects_enabled,
            "sounds": self.sounds_enabled,
            "music": self.music_enabled,
            "nsfw": self.nsfw_enabled,
            "background_animation": self.background_animation,
            "chosen_at": self.chosen_at,
        }
