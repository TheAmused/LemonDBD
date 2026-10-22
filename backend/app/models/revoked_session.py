# backend/app/models/revoked_session.py
"""Session tokens that were signed out before they expired.

A session JWT is valid until its `exp`, so signing out has to remember the token: its `jti` sits
here until that expiry and `get_current_user` refuses it meanwhile. Only the random id is stored,
never the token. The scheduler deletes rows whose token would have expired anyway.
"""
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.extensions import Base


class RevokedSession(Base):
    __tablename__ = "revoked_sessions"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
