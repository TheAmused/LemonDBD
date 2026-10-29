# backend/app/models/admin.py
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, utcnow

CHALLENGE_MODES = ("gauntlet", "chaos", "history", "page_streak", "id_please", "id_please_survivor", "id_please_killer")


class ChallengeModeSetting(Base, ColumnDictMixin):
    """One row per streak mode, letting an admin pause the whole mode
    site-wide (e.g. during a critical bug) without requiring a deployment."""

    __tablename__ = "challenge_mode_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    mode: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    disabled_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class SiteSetting(Base, ColumnDictMixin):
    """Admin-editable site setting overriding the config/env default (one row per key)."""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(String(1024), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class AdminAuditLog(Base, ColumnDictMixin):
    """Append-only record of administrative actions (who did what, when),
    e.g. disabling a character, toggling a challenge mode, changing a user's role."""

    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )


class SeedUpdateLog(Base, ColumnDictMixin):
    """Tracks applied seed files and update patches by file path and content SHA256 hash."""

    __tablename__ = "seed_update_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_identifier: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )



class MaintenanceJobRun(Base, ColumnDictMixin):
    """When each housekeeping job last ran, by the scheduler or an admin (one row per job).

    It is the only shared trace of the scheduler, which runs in its own process: the admin panel
    reads it to say whether scheduled jobs are actually running.
    """

    __tablename__ = "maintenance_job_runs"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    last_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_affected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    #: "schedule" or "admin".
    last_trigger: Mapped[str] = mapped_column(String(16), nullable=False)
