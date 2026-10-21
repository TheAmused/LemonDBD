# backend/app/models/community.py
from datetime import datetime
from typing import TYPE_CHECKING, Any
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.core.json_provider import safe_json_loads, safe_json_dumps
from app.models.base import ColumnDictMixin, utcnow

if TYPE_CHECKING:
    from app.models.user import User


class BugReport(Base, ColumnDictMixin):
    __tablename__ = "bug_reports"

    _api_exclude = frozenset({"images_json"})

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_name: Mapped[str] = mapped_column(String(100), nullable=False)
    reporter_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    images_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_unread: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User | None"] = relationship(back_populates="bug_reports")

    @staticmethod
    def parse_images(images_json: str | None) -> list[str]:
        """The attachment paths stored in an `images_json` value (an empty list for anything unexpected)."""
        value = safe_json_loads(images_json, default=[])
        return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []

    @property
    def images(self) -> list[str]:
        return safe_json_loads(self.images_json, default=[])

    @images.setter
    def images(self, value: list[str]) -> None:
        self.images_json = safe_json_dumps(value, default_val="[]")

    def to_dict(self) -> dict[str, Any]:
        data = super().to_dict()
        data["images"] = self.images
        data["reporter_email"] = self.reporter_email or ""
        data["admin_notes"] = self.admin_notes or ""
        return data
