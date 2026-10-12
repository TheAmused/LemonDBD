# backend/app/models/two_factor.py
"""Optional two-factor sign-in (TOTP authenticator app + one-time recovery codes).

Kept in their own tables, not as columns on `users`: the account data export copies every
`users` column that is not explicitly listed as secret, so a secret stored there would leave
the database the day somebody forgets to list it. Nothing here is ever exported.
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.user import User


class UserTwoFactor(Base):
    """One authenticator enrolment per account.

    A row with `enabled_at` NULL is a setup in progress (secret shown, code not confirmed yet):
    it never gates a sign-in. `secret_encrypted` is the base32 TOTP secret encrypted with
    TWO_FACTOR_ENCRYPTION_KEY (Fernet).
    """

    __tablename__ = "user_two_factor"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    secret_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    enabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Highest 30-second TOTP step already accepted: a code can be used once, never replayed.
    last_used_step: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0", nullable=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="two_factor")

    @property
    def is_enabled(self) -> bool:
        return self.enabled_at is not None


class UserRecoveryCode(Base):
    """One single-use recovery code (only a hash is stored)."""

    __tablename__ = "user_recovery_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="recovery_codes")
