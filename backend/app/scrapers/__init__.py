# backend/app/scrapers/__init__.py
from app.scrapers.types import (
    ScraperConfig,
    CharacterData,
    ItemData,
    AddonData,
    PerkData,
    MapData,
)
from app.scrapers.utils import (
    clean_description_text,
    normalize_name_key,
    sanitize_filename,
    extract_high_res_url,
    extract_slug_from_href,
    classify_portrait,
)
from app.scrapers.wikigg import WikiGGScraperDriver
from app.scrapers.maps import (
    get_map_landmarks_data,
    HensMapScraperDriver,
    SamoelColtMapScraperDriver,
)

__all__ = [
    "ScraperConfig",
    "CharacterData",
    "ItemData",
    "AddonData",
    "PerkData",
    "MapData",
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