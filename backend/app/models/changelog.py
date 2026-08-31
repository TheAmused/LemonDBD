# backend/app/models/changelog.py
from datetime import datetime
from typing import TYPE_CHECKING, Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.user import User

# Dead by Daylight themed tags. Each maps to a color treatment on the frontend
# badge (e.g. "feature" -> amber/gold, "bugfix" -> emerald, "balance" -> rose,
# "event" -> violet). Kept as a plain string column (not an enum) so new tags
# can be introduced without a migration.
CHANGELOG_TAGS = ("feature", "bugfix", "balance", "event", "announcement")


class ChangelogPost(Base):
    __tablename__ = "changelog_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # Sanitized rich-text HTML body (bold/italic/underline/color spans/lists/
    # links) produced by the admin WYSIWYG editor. Always sanitized server-side
    # before being persisted -- see app.utils.sanitize.sanitize_changelog_html.
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    tag: Mapped[str] = mapped_column(String(30), default="feature", nullable=False, index=True)
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
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    author: Mapped["User | None"] = relationship()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "content_html": self.content_html,
            "tag": self.tag,
            "position": self.position,
            "is_published": self.is_published,
            "author_id": self.author_id,
            "author_name": self.author_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
