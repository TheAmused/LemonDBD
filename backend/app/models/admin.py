# backend/app/models/admin.py
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow

CHALLENGE_MODES = ("gauntlet", "chaos", "history", "page_streak")


class ChallengeModeSetting(Base):
    """One row per streak mode, letting an admin pause the whole mode
    site-wide (e.g. a critical bug) without a hotfix deploy."""

    __tablename__ = "challenge_mode_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    mode: Mapped[str] = mapped_column(String(20), unique=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    disabled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "mode": self.mode,
            "is_enabled": self.is_enabled,
            "disabled_reason": self.disabled_reason,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AdminAuditLog(Base):
    """Append-only record of administrative actions (who did what, when),
    e.g. disabling a character, toggling a challenge mode, changing a
    user's role. Not itself editable through the API."""

    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100))
    target_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "admin_user_id": self.admin_user_id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
