# backend/app/services/perks/utils.py
import html
import re
import unicodedata
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

HEADER_EXCLUSIONS: Set[str] = {
    "uncommon items",
    "rare items",
    "very rare items",
    "ultra rare items",
    "common items",
    "event items",
    "unused item",
    "limited items",
    "survivor items",
    "killer items",
    "items",
    "add-ons",
    "addons",
    "equipment",
}

DEFAULT_SURVIVORS: List[str] = [
    "Meg Thomas",
    "Claudette Morel",
    "Dwight Fairfield",
    "Jake Park",
    "Nea Karlsson",
    "Laurie Strode",
    "Ace Visconti",
]

DEFAULT_KILLERS: List[str] = [
    "The Trapper",
    "The Wraith",
    "The Hillbilly",
    "The Nurse",
    "The Shape",
    "The Hag",
    "The Doctor",
    "The Huntress",
]


def normalize_search_key(text: str) -> str:
    """Normalize input text for fuzzy token matching and search indexing."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    normalized = normalized.lower().strip()
    normalized = re.sub(r"[^a-z0-9]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def sanitize_name(name: str) -> str:
    """Sanitizes names into identifier format."""
    clean_str = name.lower().strip()
    clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
    clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
    clean_str = re.sub(r"_+", "_", clean_str)
    return clean_str.strip("_")


def slugify(text: str) -> str:
    """Creates a URL-safe alphanumeric slug."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    clean = normalized.lower().strip()
    clean = re.sub(r"[\s\-/]+", "_", clean)
    clean = re.sub(r"[^a-z0-9_]", "", clean)
    clean = re.sub(r"_+", "_", clean)
    return clean.strip("_")


def clean_description(text: str) -> str:
    """Cleans raw Wiki HTML tags, replaces encoding artifacts, and formats numbers."""
    if not text or not isinstance(text, str):
        return ""
    cleaned = re.sub(r"<[^>]+>", "", text)
    cleaned = re.sub(r'\b[a-zA-Z0-9_-]+=["\'][^"\']*["\']\s*>?', "", cleaned)
    cleaned = html.unescape(cleaned)
    cleaned = cleaned.replace("\ufffd", '"')
    cleaned = re.sub(r'\?([A-Z"])', r'"\1', cleaned)
    cleaned = re.sub(r'([a-z.,!])\?\s*-', r'\1" -', cleaned)
    cleaned = re.sub(r'(\d+)(?:\s*/\s*(\d+))+', lambda m: re.sub(r'\s*/\s*', '/', m.group(0)), cleaned)
    cleaned = re.sub(r'(\d+)\s+(%)', r'\1\2', cleaned)
    cleaned = re.sub(r'(\d+)\s+(s|m)\b(?!\w)', r'\1\2', cleaned)
    return cleaned.strip()


class CharacterModel(BaseModel):
    name: str = Field(..., description="Canonical title e.g. 'Meg Thomas' or 'The Wraith'")
    real_name: Optional[str] = Field(default="", description="Real name e.g. 'Philip Ojomo'")
    wiki_slug: Optional[str] = ""
    short_name: Optional[str] = ""
    category: str = "Survivor"
    avatar_url: Optional[str] = ""
    avatar_local_path: Optional[str] = ""
    release_number: Optional[int] = None


class ItemModel(BaseModel):
    name: str
    category: str = ""
    role: Optional[str] = "Survivor"
    description: Optional[str] = ""
    icon_url: Optional[str] = ""
    icon_local_path: Optional[str] = ""
    rarity: Optional[str] = ""


class AddonModel(BaseModel):
    name: str
    associated_target: Optional[str] = ""
    category: Optional[str] = ""
    description: Optional[str] = ""
    icon_url: Optional[str] = ""
    icon_local_path: Optional[str] = ""
    rarity: Optional[str] = ""


class MapModel(BaseModel):
    id: str
    name: str
    realm: str
    realm_id: Optional[str] = ""
    callout_image_url: Optional[str] = ""
    callout_image_local_path: Optional[str] = ""
    source: Optional[str] = "hens333"
    source_label: Optional[str] = "Hens333 12-Clock Callouts"
    clock_system: Optional[Dict[str, Any]] = None
    tiles: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    objectives: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    totems: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    seed_variant: Optional[str] = "seed_a"
    floor: Optional[int] = 1


class PerkModel(BaseModel):
    name: str
    alternate_name: Optional[str] = ""
    is_generic_counterpart: bool = False
    character: str = "General"
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""
    category: str = "Survivor"
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""

