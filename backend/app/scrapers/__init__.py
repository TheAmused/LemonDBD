# backend/app/scrapers/__init__.py
from app.scrapers.constants import (
    GENERIC_PERK_CANONICAL_MAP,
    KNOWN_KILLER_POWER_ALIASES,
)
from app.scrapers.maps import (
    HensMapScraperDriver,
    SamoelColtMapScraperDriver,
    get_map_landmarks_data,
)
from app.scrapers.types import (
    AddonData,
    CharacterData,
    ItemData,
    MapData,
    PerkData,
    ScraperConfig,
)
from app.scrapers.utils import (
    classify_portrait,
    clean_description_text,
    extract_high_res_url,
    extract_slug_from_href,
    normalize_name_key,
    sanitize_filename,
)
from app.scrapers.wikigg import WikiGGScraperDriver

__all__ = [
    "ScraperConfig",
    "CharacterData",
    "ItemData",
    "AddonData",
    "PerkData",
    "MapData",
    "GENERIC_PERK_CANONICAL_MAP",
    "KNOWN_KILLER_POWER_ALIASES",
    "clean_description_text",
    "normalize_name_key",
    "sanitize_filename",
    "extract_high_res_url",
    "extract_slug_from_href",
    "classify_portrait",
    "WikiGGScraperDriver",
    "get_map_landmarks_data",
    "HensMapScraperDriver",
    "SamoelColtMapScraperDriver",
]
