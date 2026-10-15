# backend/app/models/sanction.py
"""Warnings, suspensions and bans: the source of truth for an account's moderation state.

`User.is_active` / `User.suspended_until` are read-optimised copies derived from these rows by
`services/moderation_actions.py`. "Active" is never stored: a sanction is active while it is not
revoked and has not reached `expires_at` (a ban has none).
"""
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.extensions import Base
from app.models.base import ColumnDictMixin, column_dict, utcnow

SANCTION_KINDS = ("warning", "suspension", "ban")
SANCTION_SOURCES = ("manual", "content_report")
#: The report categories plus the two that only make sense for an account.
SANCTION_REASONS = (
    "hate_speech",
    "harassment",
    "explicit",
    "illegal",
    "spam",
    "cheating",
    "ban_evasion",
    "other",
)
#: Sections of the Rules page a decision can cite (keys of `locales/*/rules.ts` `sections`).
RULE_REFS = ("respect", "fairPlay", "yourContent", "smashOrPass", "serverCare", "reporting", "enforcement")
NOTIFICATION_EVENTS = ("issued", "lifted", "ended")


class UserSanction(Base, ColumnDictMixin):
    __tablename__ = "user_sanctions"
    __table_args__ = (
        CheckConstraint("kind IN ('warning', 'suspension', 'ban')", name="ck_user_sanctions_kind"),
        Index("idx_user_sanctions_user_issued", "user_id", "issued_at"),
    )

    #: What the account holder may see about a decision (no internal notes, no admin, no report).
    _user_columns = (
        "id",
        "kind",
        "reason_code",
        "rule_ref",
        "facts",
        "public_message",
        "issued_at",
        "expires_at",
        "revoked_at",
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    reason_code: Mapped[str] = mapped_column(String(32), nullable=False)
    rule_ref: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # What happened, in the moderator's words (required for suspensions and bans; the evidence itself
    # is wiped by design, so the decision must be explainable without it).
    facts: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Shown to the account holder as written, in the moderator's language.
    public_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Admin eyes only; never sent, never exported.
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(24), default="manual", nullable=False)
    report_id: Mapped[int | None] = mapped_column(
        ForeignKey("content_reports.id", ondelete="SET NULL"), nullable=True
    )
    issued_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revoke_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    def to_user_dict(self) -> dict[str, Any]:
        """The account holder's view of the decision."""
        full = column_dict(self)
        return {key: full[key] for key in self._user_columns}


class SanctionNotification(Base, ColumnDictMixin):
    """Transactional outbox: one row per email owed to the account holder.

    The row is written in the same transaction as the decision, so a decision that committed always
    has its email queued. Delivery claims the row with a compare-and-set on `in_flight_at`.
    """

    __tablename__ = "sanction_notifications"
    __table_args__ = (
        UniqueConstraint("sanction_id", "event", name="uq_sanction_notification_event"),
        Index(
            "idx_sanction_notifications_unsent",
            "created_at",
            postgresql_where=text("notified_at IS NULL"),
            sqlite_where=text("notified_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sanction_id: Mapped[int] = mapped_column(
        ForeignKey("user_sanctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    in_flight_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)


class BannedEmailHash(Base):
    """Ban-evasion list entry: a keyed hash of a permanently banned account's canonical e-mail.

    Only the HMAC is stored (never the address), under a pepper kept outside the database, so the
    table alone cannot be reversed into addresses. One row per ban: lifting the ban deletes its row;
    a row whose account was deleted (`sanction_id` set to NULL) stays until `expires_at`. Read only
    when an account is created. Part of the database export/import (see `services/ban_list.py`).
    """

    __tablename__ = "banned_email_hashes"
    __table_args__ = (
        UniqueConstraint("email_hmac", "sanction_id", name="uq_banned_email_hash_sanction"),
        Index("idx_banned_email_hashes_expires", "expires_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email_hmac: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    key_version: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    sanction_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_sanctions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason_code: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
