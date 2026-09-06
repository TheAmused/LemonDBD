# backend/app/models/chapter.py
from datetime import datetime
from typing import Any
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.extensions import Base
from app.models.base import utcnow


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "banner_url": self.banner_url,
            "banner_local_path": self.banner_local_path,
        }
