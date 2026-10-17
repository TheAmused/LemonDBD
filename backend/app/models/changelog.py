# backend/app/models/changelog.py
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, utcnow

if TYPE_CHECKING:
    from app.models.user import User


class ChangelogPost(Base, ColumnDictMixin):
    __tablename__ = "changelog_posts"

    # The feed is written by the team, so the author is never shown. Kept in the table for audit.
    _api_exclude = frozenset({"author_id", "author_name", "discord_message_id"})

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # Sanitized rich-text HTML body (bold/italic/underline/color spans/lists/
    # links) produced by the admin WYSIWYG editor. Always sanitized server-side
    # before being persisted -- see app.utils.sanitize.sanitize_changelog_html.
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    # Manual admin sort order for the "What's New?" feed -- lower shows first. New posts default to the current minimum minus one so they land on top; admins can then drag-reorder freely (see the /reorder route).
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    is_published: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_name: Mapped[str] = mapped_column(String(100), default="The Entity", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    # When the post first went live: the date readers see and what "new since your last visit" compares
    # against. None while it is still a draft; kept if it is unpublished and published again.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # When the title or text of an entry that was already live last changed (readers see an "Edited" note).
    # Edits made while it was still a draft do not count.
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Set once the entry was posted to Discord; an entry is announced only once.
    discord_announced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # The Discord message holding the entry, so a later edit can update it in place. Never sent to the browser.
    discord_message_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # When that message last matched the entry. Only set while the message id is known, so "edited_at is
    # newer than this" means the Discord message can be updated and is behind.
    discord_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    author: Mapped["User | None"] = relationship()
