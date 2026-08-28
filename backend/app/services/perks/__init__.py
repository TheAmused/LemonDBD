# backend/app/services/perks/__init__.py
from app.services.perks.loader import (
    load_fallback_files,
    reload_service_data,
    seed_database_from_json_files,
)
from app.services.perks.queries_character import (
    fetch_character_detail,
    fetch_character_suggestions,
    fetch_characters,
)
from app.services.perks.queries_equipment import (
    fetch_addons,
    fetch_items,
)
from app.services.perks.queries_map import (
    fetch_map_detail,
    fetch_maps,
)
from app.services.perks.queries_perk import (
    fetch_perk_by_identifier,
    fetch_perk_suggestions,
    fetch_perks,
    fetch_perks_fallback,
)
from app.services.perks.utils import (
    DEFAULT_KILLERS,
    DEFAULT_SURVIVORS,
    HEADER_EXCLUSIONS,
    AddonModel,
    CharacterModel,
    ItemModel,
    MapModel,
    PerkModel,
    clean_description,
    normalize_search_key,
    sanitize_name,
    slugify,
)

__all__ = [
    "HEADER_EXCLUSIONS",
    "DEFAULT_SURVIVORS",
    "DEFAULT_KILLERS",
    "normalize_search_key",
    "sanitize_name",
    "slugify",
    "clean_description",
    "CharacterModel",
    "ItemModel",
    "AddonModel",
    "MapModel",
    "PerkModel",
    "seed_database_from_json_files",
    "load_fallback_files",
    "reload_service_data",
    "fetch_perks",
    "fetch_perks_fallback",
    "fetch_perk_suggestions",
    "fetch_perk_by_identifier",
    "fetch_characters",
    "fetch_character_suggestions",
    "fetch_character_detail",
    "fetch_items",
    "fetch_addons",
    "fetch_maps",
    "fetch_map_detail",
]
