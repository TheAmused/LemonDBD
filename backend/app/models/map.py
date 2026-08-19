# backend/app/models/map.py
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import utcnow


class MapRealm(Base):
    __tablename__ = "map_realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    realm: Mapped[str] = mapped_column(String(100))
    realm_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(50), default="hens333")
    source_label: Mapped[Optional[str]] = mapped_column(
        String(100), default="Hens333 12-Clock Callouts"
    )
    layout_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    jungle_gyms_count: Mapped[int] = mapped_column(Integer, default=0)
    totem_spawns_count: Mapped[int] = mapped_column(Integer, default=5)
    pallet_density: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    shack_has_basement: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    callout_image_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    callout_image_local_path: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    tiles: Mapped[List["MapTile"]] = relationship(
        back_populates="map_realm", cascade="all, delete-orphan"
    )
    objectives: Mapped[List["MapObjective"]] = relationship(
        back_populates="map_realm", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.map_id,
            "name": self.name,
            "realm": self.realm,
            "realm_id": self.realm_id or "",
            "source": self.source or "hens333",
            "source_label": self.source_label
            or "Hens333 12-Clock Callouts",
            "callout_image_url": self.callout_image_url
            or self.image_url
            or "",
            "callout_image_local_path": self.callout_image_local_path or "",
            "image_url": self.image_url or self.callout_image_url or "",
            "layout_type": self.layout_type,
            "jungle_gyms_count": self.jungle_gyms_count,
            "totem_spawns_count": self.totem_spawns_count,
            "pallet_density": self.pallet_density,
            "shack_has_basement": self.shack_has_basement,
            "description": self.description,
            "tiles": [t.to_dict() for t in self.tiles],
            "objectives": [o.to_dict() for o in self.objectives],
        }


class MapTile(Base):
    __tablename__ = "map_tiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(
        ForeignKey("map_realms.map_id", ondelete="CASCADE"), index=True
    )
    seed_variant: Mapped[str] = mapped_column(String(50), default="seed_a")
    floor: Mapped[int] = mapped_column(Integer, default=1)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    has_pallet: Mapped[bool] = mapped_column(Boolean, default=False)
    pallet_safety_rating: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    has_window: Mapped[bool] = mapped_column(Boolean, default=False)
    vault_directions: Mapped[str] = mapped_column(Text, default="[]")
    looping_tips: Mapped[str] = mapped_column(Text, default="")
    mindgame_counter: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    map_realm: Mapped["MapRealm"] = relationship(back_populates="tiles")

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.type,
            "position": {"x": self.x, "y": self.y},
            "has_pallet": self.has_pallet,
            "pallet_safety_rating": self.pallet_safety_rating,
            "has_window": self.has_window,
            "vault_directions": self.vault_directions,
            "looping_tips": self.looping_tips,
            "mindgame_counter": self.mindgame_counter,
            "seed_variant": self.seed_variant,
            "floor": self.floor,
        }


class MapObjective(Base):
    __tablename__ = "map_objectives"

    id: Mapped[int] = mapped_column(primary_key=True)
    map_id: Mapped[str] = mapped_column(
        ForeignKey("map_realms.map_id", ondelete="CASCADE"), index=True
    )
    seed_variant: Mapped[str] = mapped_column(String(50), default="seed_a")
    floor: Mapped[int] = mapped_column(Integer, default=1)
    type: Mapped[str] = mapped_column(String(50))
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    location_description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    map_realm: Mapped["MapRealm"] = relationship(back_populates="objectives")

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "position": {"x": self.x, "y": self.y},
            "location_description": self.location_description,
            "seed_variant": self.seed_variant,
            "floor": self.floor,
        }

