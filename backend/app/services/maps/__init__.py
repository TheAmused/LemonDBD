# backend/app/services/maps/__init__.py
from app.services.maps.data import (
    DEFAULT_OBJECTIVES_SEED_A,
    DEFAULT_TILES_SEED_A,
    SAMPLE_MAPS,
)
from app.services.maps.queries import fetch_map_by_id, fetch_maps
from app.services.maps.seeder import seed_maps_if_empty

__all__ = [
    "SAMPLE_MAPS",
    "DEFAULT_TILES_SEED_A",
    "DEFAULT_OBJECTIVES_SEED_A",
    "seed_maps_if_empty",
    "fetch_maps",
    "fetch_map_by_id",
]
