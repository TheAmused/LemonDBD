# backend/app/models/map.py
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import ColumnDictMixin, TranslatableModelMixin, utcnow

if TYPE_CHECKING:
    from app.models.equipment import Offering

#: The callout provider every map currently uses.
DEFAULT_SOURCE_CODE = "lemondbd"
DEFAULT_SOURCE_LABEL = "LemonDBD 12-Clock Callouts"

#: Fallback layout figures if a map record has not defined specific values.
DEFAULT_LAYOUT_TYPE = "Outdoor"
DEFAULT_PALLET_DENSITY = "Medium"
DEFAULT_JUNGLE_GYMS = 3
DEFAULT_IS_SHACK = True
DEFAULT_IS_MAIN_BUILDING = False


class Realm(Base, TranslatableModelMixin):
    """A realm -- the themed environment a set of maps belongs to."""

    __tablename__ = "realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    maps: Mapped[list["MapRealm"]] = relationship(back_populates="realm")
    offerings: Mapped[list["Offering"]] = relationship(back_populates="realm")

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.localized_name(lang),
            "raw_name": self.name,
            "image_url": self.image_url or "",
            "image_local_path": self.image_local_path or "",
        }


class MapSource(Base, ColumnDictMixin):
    """Who produced a set of map callouts."""

    __tablename__ = "map_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)

    maps: Mapped[list["MapRealm"]] = relationship(back_populates="source")


class MapRealm(Base, TranslatableModelMixin):
    """A single map within a realm, including layout figures and sizes."""

    __tablename__ = "map_realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    realm_id: Mapped[int] = mapped_column(
        ForeignKey("realms.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    source_id: Mapped[int] = mapped_column(
        ForeignKey("map_sources.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    callout_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    callout_image_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Specific DbD Map Layout Parameters
    layout_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default=DEFAULT_LAYOUT_TYPE
    )
    pallet_density: Mapped[str] = mapped_column(
        String(50), nullable=False, default=DEFAULT_PALLET_DENSITY
    )
    jungle_gyms_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_JUNGLE_GYMS
    )
    # Which landmark structures the map has.
    is_shack: Mapped[bool] = mapped_column(nullable=False, default=DEFAULT_IS_SHACK)
    is_main_building: Mapped[bool] = mapped_column(
        nullable=False, default=DEFAULT_IS_MAIN_BUILDING
    )

    # Size measurements (Wiki.gg: sqT = 8x8m tiles, sq_meters = sqT * 64)
    size_sq_tiles: Mapped[float | None] = mapped_column(Float, nullable=True)
    size_sq_meters: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # The map's footprint drawn in metres, one entry per floor: outline rings
    # traced from the current wiki.gg outline (8 m grid), plus optional
    # `blocked` rings. NULL for maps with no published to-scale outline; the
    # frontend then shows the callout image instead.
    layout: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )

    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    realm: Mapped["Realm"] = relationship(back_populates="maps", lazy="joined")
    source: Mapped["MapSource"] = relationship(back_populates="maps", lazy="joined")

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        name = self.localized(lang, "name", self.name)

        return {
            "id": self.id,
            "name": name,
            "raw_name": self.name,
            "realm": self.realm.localized_name(lang) if self.realm else "",
            "raw_realm": self.realm.name if self.realm else "",
            "realm_id": self.realm_id,
            "source_id": self.source_id,
            "source": self.source.code if self.source else DEFAULT_SOURCE_CODE,
            "source_label": self.source.label if self.source else DEFAULT_SOURCE_LABEL,
            "callout_image_url": self.callout_image_url or "",
            "callout_image_local_path": self.callout_image_local_path or "",
            "image_url": self.callout_image_url or "",
            "layout_type": self.layout_type or DEFAULT_LAYOUT_TYPE,
            "jungle_gyms_count": (
                self.jungle_gyms_count
                if self.jungle_gyms_count is not None
                else DEFAULT_JUNGLE_GYMS
            ),
            "pallet_density": self.pallet_density or DEFAULT_PALLET_DENSITY,
            "is_shack": self.is_shack if self.is_shack is not None else DEFAULT_IS_SHACK,
            "is_main_building": (
                self.is_main_building
                if self.is_main_building is not None
                else DEFAULT_IS_MAIN_BUILDING
            ),
            "size_sq_tiles": self.size_sq_tiles,
            "size_sq_meters": self.size_sq_meters,
            "layout": self.layout,
            "description": self.description,
        }