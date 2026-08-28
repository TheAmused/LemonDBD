# backend/app/schemas/map.py
from pydantic import BaseModel, ConfigDict, Field


class MapPosition(BaseModel):
    x: float
    y: float


class MapTileBase(BaseModel):
    seed_variant: str = "seed_a"
    floor: int = 1
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=50)
    x: float
    y: float
    has_pallet: bool = False
    pallet_safety_rating: str | None = Field(None, max_length=20)
    has_window: bool = False
    vault_directions: str = "[]"
    looping_tips: str = ""
    mindgame_counter: str = ""


class MapTileResponse(BaseModel):
    name: str
    type: str
    position: MapPosition
    has_pallet: bool
    pallet_safety_rating: str | None = None
    has_window: bool
    vault_directions: str
    looping_tips: str
    mindgame_counter: str
    seed_variant: str
    floor: int

    model_config = ConfigDict(from_attributes=True)


class MapObjectiveBase(BaseModel):
    seed_variant: str = "seed_a"
    floor: int = 1
    type: str = Field(..., max_length=50)
    x: float
    y: float
    location_description: str = ""


class MapObjectiveResponse(BaseModel):
    type: str
    position: MapPosition
    location_description: str
    seed_variant: str
    floor: int

    model_config = ConfigDict(from_attributes=True)


class MapRealmBase(BaseModel):
    map_id: str = Field(..., max_length=100)
    name: str = Field(..., max_length=150)
    realm: str = Field(..., max_length=100)
    realm_id: str | None = Field(None, max_length=100)
    source: str | None = "hens333"
    source_label: str | None = "Hens333 12-Clock Callouts"
    layout_type: str | None = None
    jungle_gyms_count: int = 0
    totem_spawns_count: int = 5
    pallet_density: str | None = None
    shack_has_basement: bool = True
    description: str | None = None
    image_url: str | None = None
    callout_image_url: str | None = None
    callout_image_local_path: str | None = None


class MapRealmResponse(BaseModel):
    id: str
    name: str
    realm: str
    realm_id: str | None = ""
    source: str
    source_label: str
    callout_image_url: str
    callout_image_local_path: str
    image_url: str
    layout_type: str | None = None
    jungle_gyms_count: int
    totem_spawns_count: int
    pallet_density: str | None = None
    shack_has_basement: bool
    description: str | None = None
    tiles: list[MapTileResponse] = []
    objectives: list[MapObjectiveResponse] = []

    model_config = ConfigDict(from_attributes=True)
