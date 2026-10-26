# backend/app/models/map_layout.py
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.map import MapRealm


class MapLayout(Base):
    """The scalable vector footprint of a map, decoupled from core map metadata."""

    __tablename__ = "map_layouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[int] = mapped_column(
        ForeignKey("map_realms.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    layout_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    map: Mapped["MapRealm"] = relationship(back_populates="layout_record")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "map_id": self.map_id,
            "version": self.version,
            "layout": self.layout_data,
        }
