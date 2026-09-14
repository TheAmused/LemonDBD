# backend/app/models/map.py
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.extensions import Base
from app.models.base import utcnow

if TYPE_CHECKING:
    from app.models.equipment import Offering

#: The callout provider every map currently uses.
DEFAULT_SOURCE_CODE = "hens333"
DEFAULT_SOURCE_LABEL = "Hens333 12-Clock Callouts"

#: Layout figures that were stored per map but never varied. They stay in the
#: API response; when real per-map values exist, give them columns again --
#: with values that actually differ.
DEFAULT_LAYOUT_TYPE = "Standard"
DEFAULT_PALLET_DENSITY = "Medium"
DEFAULT_JUNGLE_GYMS = 4
DEFAULT_TOTEM_SPAWNS = 5
DEFAULT_SHACK_HAS_BASEMENT = True


class Realm(Base):
    """A realm -- the themed environment a set of maps belongs to.

    `map_realms.realm_id` used to be a slug *string* ("autohaven_wreckers")
    that matched no column here, while the actual link was the display name
    repeated in `map_realms.realm`. It is an integer foreign key now.
    """

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

    def localized_name(self, lang: str | None = None) -> str:
        if lang and self.translations:
            trans = self.translations.get(lang)
            if isinstance(trans, dict) and trans.get("name"):
                return str(trans["name"])
        return self.name

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.localized_name(lang),
            "raw_name": self.name,
            "image_url": self.image_url or "",
            "image_local_path": self.image_local_path or "",
        }


class MapSource(Base):
    """Who produced a set of map callouts.

    `map_realms` carried `source` ("hens333") and `source_label` ("Hens333
    12-Clock Callouts") as strings on all 58 rows -- 58 copies of one label,
    for a column the API already exposes as a filter and that the frontend
    already anticipates a second value for ("samoelcolt", in
    utils/mapLandmarks.ts). One row per provider instead.

    `code` is not a join key -- `map_realms.source_id` is -- it is the literal
    value the public API accepts as `?source=hens333`.
    """

    __tablename__ = "map_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)

    maps: Mapped[list["MapRealm"]] = relationship(back_populates="source")

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "code": self.code, "label": self.label}


class MapRealm(Base):
    """A single map within a realm.

    `realm` (the display name) and `realm_id` (a slug string that matched no
    column anywhere) are replaced by one integer foreign key. The realm name
    was also duplicated into this row's `translations` under a `realm` key,
    once per map per language -- 232 copies of 21 names. That is gone too;
    the name comes from the realm.

    `map_id` is gone. It was a second identity on a table that already had a
    primary key -- and it spelled out `hens_autohaven_wreckers_azarovs_resting_place`:
    the callout provider, the realm and the map name, which are `source_id`,
    `realm_id` and `name` on the same row. The tile and objective tables that
    referenced it no longer exist, so nothing needed a string key. `to_dict`
    emits the integer id under `id`, as it always did under that name.

    `image_url` is gone: it was a byte-identical copy of `callout_image_url`
    on all 58 rows. `to_dict` still emits both names from the one column.

    Seven more columns are gone. Each held exactly one value across all 58
    rows: `source` ("hens333"), `source_label` ("Hens333 12-Clock Callouts"),
    `layout_type` ("Standard"), `pallet_density` ("Medium"),
    `jungle_gyms_count` (4), `totem_spawns_count` (5) and `shack_has_basement`
    (true) -- 406 cells storing seven constants, and nothing in the frontend
    reads five of them outside a type declaration. The two that are real
    (`source`, `source_label`) became `map_sources`; the five layout figures
    are gone until there is per-map data to put in them, and `to_dict` still
    emits them from module-level defaults so the API shape is unchanged.

    `tiles` and `objectives` are gone from `to_dict` too, not just from the
    database. `map_objectives` was empty for all 58 maps; `map_tiles` was 290
    rows containing five generic placeholder names ("12 O'Clock: Main Landmark
    / North Exit Gate") copied onto every map -- the same five, so the table
    distinguished nothing. What the UI renders as the callout system is the
    image at `callout_image_url`; no client has ever drawn these rows, so
    unlike the layout figures above there was no live API shape worth holding
    stable for them.
    """

    __tablename__ = "map_realms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    # Both NOT NULL: every one of the 58 maps resolves to a realm and a source.
    realm_id: Mapped[int] = mapped_column(
        ForeignKey("realms.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    source_id: Mapped[int] = mapped_column(
        ForeignKey("map_sources.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    callout_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    callout_image_local_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    translations: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    realm: Mapped["Realm"] = relationship(back_populates="maps", lazy="joined")
    source: Mapped["MapSource"] = relationship(back_populates="maps", lazy="joined")

    def to_dict(self, lang: str | None = None) -> dict[str, Any]:
        name = self.name
        if lang and self.translations:
            trans = self.translations.get(lang) or {}
            if isinstance(trans, dict):
                name = trans.get("name") or name

        return {
            "id": self.id,
            "name": name,
            "realm": self.realm.localized_name(lang) if self.realm else "",
            "realm_id": self.realm_id,
            "source_id": self.source_id,
            "source": self.source.code if self.source else DEFAULT_SOURCE_CODE,
            "source_label": self.source.label if self.source else DEFAULT_SOURCE_LABEL,
            "callout_image_url": self.callout_image_url or "",
            "callout_image_local_path": self.callout_image_local_path or "",
            # One stored URL, two names on the wire: `image_url` held a
            # byte-identical copy of `callout_image_url` on all 58 rows.
            "image_url": self.callout_image_url or "",
            # Unchanged on the wire, served from the defaults below rather than
            # from five columns that held the same value 58 times each.
            "layout_type": DEFAULT_LAYOUT_TYPE,
            "jungle_gyms_count": DEFAULT_JUNGLE_GYMS,
            "totem_spawns_count": DEFAULT_TOTEM_SPAWNS,
            "pallet_density": DEFAULT_PALLET_DENSITY,
            "shack_has_basement": DEFAULT_SHACK_HAS_BASEMENT,
            "description": self.description,
        }
