# backend/app/schemas/map.py
"""Pydantic DTOs for `app.models.map`: `Realm`, `MapSource`, `MapRealm`."""
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

DEFAULT_LAYOUT_TYPE = "Outdoor"
DEFAULT_PALLET_DENSITY = "Medium"
DEFAULT_JUNGLE_GYMS = 3
DEFAULT_TOTEM_SPAWNS = 5
DEFAULT_IS_SHACK = True
DEFAULT_IS_MAIN_BUILDING = False
DEFAULT_SOURCE_CODE = "hens333"
DEFAULT_SOURCE_LABEL = "Hens333 12-Clock Callouts"


class RealmBase(BaseModel):
    """Write shape for a row of `realms`."""

    name: str = Field(..., max_length=100)
    image_url: str | None = Field(None, max_length=500)
    image_local_path: str | None = Field(None, max_length=255)
    translations: dict[str, Any] | None = None


class RealmResponse(BaseModel):
    """Mirrors `Realm.to_dict()`."""

    id: int
    name: str
    raw_name: str
    image_url: str = ""
    image_local_path: str = ""

    model_config = ConfigDict(from_attributes=True)


class MapSourceBase(BaseModel):
    """Write shape for a row of `map_sources`."""

    code: str = Field(..., max_length=50)
    label: str = Field(..., max_length=100)


class MapSourceResponse(MapSourceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MapRealmBase(BaseModel):
    """Write shape for a row of `map_realms`."""

    name: str = Field(..., max_length=150)
    realm_id: int
    source_id: int
    description: str | None = None
    callout_image_url: str | None = Field(None, max_length=500)
    callout_image_local_path: str | None = Field(None, max_length=255)
    layout_type: str | None = DEFAULT_LAYOUT_TYPE
    pallet_density: str | None = DEFAULT_PALLET_DENSITY
    jungle_gyms_count: int | None = DEFAULT_JUNGLE_GYMS
    totem_spawns_count: int | None = DEFAULT_TOTEM_SPAWNS
    is_shack: bool | None = DEFAULT_IS_SHACK
    is_main_building: bool | None = DEFAULT_IS_MAIN_BUILDING
    size_sq_tiles: float | None = None
    size_sq_meters: int | None = None
    translations: dict[str, Any] | None = None


class MapRealmResponse(BaseModel):
    """Mirrors `MapRealm.to_dict()`."""

    id: int
    name: str
    realm: str = ""
    realm_id: int
    source_id: int
    source: str = DEFAULT_SOURCE_CODE
    source_label: str = DEFAULT_SOURCE_LABEL
    callout_image_url: str = ""
    callout_image_local_path: str = ""
    image_url: str = ""
    layout_type: str = DEFAULT_LAYOUT_TYPE
    pallet_density: str = DEFAULT_PALLET_DENSITY
    jungle_gyms_count: int = DEFAULT_JUNGLE_GYMS
    totem_spawns_count: int = DEFAULT_TOTEM_SPAWNS
    is_shack: bool = DEFAULT_IS_SHACK
    is_main_building: bool = DEFAULT_IS_MAIN_BUILDING
    size_sq_tiles: float | None = None
    size_sq_meters: int | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)