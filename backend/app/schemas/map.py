# backend/app/schemas/map.py
"""Pydantic DTOs for `app.models.map`: `Realm`, `MapSource`, `MapRealm`.

`MapRealm` no longer has `map_id`, `image_url`, `realm` (a display-name
string) or the five constant "layout" columns (`layout_type`,
`pallet_density`, `jungle_gyms_count`, `totem_spawns_count`,
`shack_has_basement`) -- see the module docstring on `app.models.map` for why.
`MapRealmResponse` still emits all of those keys, because `MapRealm.to_dict()`
still does: `image_url` is a second name for `callout_image_url`, and the five
layout keys come from module-level defaults so the wire shape is unchanged
even though the columns are gone. `tiles` and `objectives` are not among
them: `MapRealm.to_dict()` no longer emits either key, so this schema doesn't
declare them either -- there is no `map_tiles`/`map_objectives` table behind
them any more, and unlike the layout figures there was no live API shape
worth preserving for two keys that were always empty or always five
duplicated placeholders.
"""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

#: Mirrors `app.models.map`'s module-level defaults, emitted by
#: `MapRealm.to_dict()` in place of the columns that used to hold them.
DEFAULT_LAYOUT_TYPE = "Standard"
DEFAULT_PALLET_DENSITY = "Medium"
DEFAULT_JUNGLE_GYMS = 4
DEFAULT_TOTEM_SPAWNS = 5
DEFAULT_SHACK_HAS_BASEMENT = True
DEFAULT_SOURCE_CODE = "hens333"
DEFAULT_SOURCE_LABEL = "Hens333 12-Clock Callouts"


class RealmBase(BaseModel):
    """Write shape for a row of `realms`."""

    name: str = Field(..., max_length=100)
    image_url: str | None = Field(None, max_length=500)
    image_local_path: str | None = Field(None, max_length=255)
    translations: dict[str, Any] | None = None


class RealmResponse(BaseModel):
    """Mirrors `Realm.to_dict()`.

    Note `translations` is absent here on purpose: it's a real column
    (`RealmBase` above can write it, and `Realm.localized_name()` reads it
    for `name`), but `Realm.to_dict()` itself never puts the raw blob on the
    wire -- only the already-localized `name` and the canonical `raw_name`.
    """

    id: int
    name: str
    raw_name: str
    image_url: str = ""
    image_local_path: str = ""

    model_config = ConfigDict(from_attributes=True)


class MapSourceBase(BaseModel):
    """Write shape for a row of `map_sources`. `code` is the literal value the
    public API accepts as `?source=<code>`, not a join key."""

    code: str = Field(..., max_length=50)
    label: str = Field(..., max_length=100)


class MapSourceResponse(MapSourceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MapRealmBase(BaseModel):
    """Write shape for a row of `map_realms`. Both foreign keys are required:
    every map resolves to a realm and a source, same as the NOT NULL columns."""

    name: str = Field(..., max_length=150)
    realm_id: int
    source_id: int
    description: str | None = None
    callout_image_url: str | None = Field(None, max_length=500)
    callout_image_local_path: str | None = Field(None, max_length=255)
    translations: dict[str, Any] | None = None


class MapRealmResponse(BaseModel):
    """Mirrors `MapRealm.to_dict()`, including the five layout keys, which are
    served from constants rather than columns. No `tiles`/`objectives` fields:
    `to_dict()` doesn't emit them and there is nothing behind them any more."""

    id: int
    name: str
    realm: str = ""
    realm_id: int
    source_id: int
    source: str = DEFAULT_SOURCE_CODE
    source_label: str = DEFAULT_SOURCE_LABEL
    callout_image_url: str = ""
    callout_image_local_path: str = ""
    #: Byte-identical to `callout_image_url` on every row -- kept as a second
    #: key because that's what `to_dict()` still emits, not because the two
    #: can ever differ.
    image_url: str = ""
    layout_type: str = DEFAULT_LAYOUT_TYPE
    jungle_gyms_count: int = DEFAULT_JUNGLE_GYMS
    totem_spawns_count: int = DEFAULT_TOTEM_SPAWNS
    pallet_density: str = DEFAULT_PALLET_DENSITY
    shack_has_basement: bool = DEFAULT_SHACK_HAS_BASEMENT
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
