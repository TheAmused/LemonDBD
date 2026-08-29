# backend/app/services/perks/utils.py
import html
import re
import unicodedata
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

HEADER_EXCLUSIONS: set[str] = {
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

DEFAULT_SURVIVORS: list[str] = [
    "Meg Thomas",
    "Claudette Morel",
    "Dwight Fairfield",
    "Jake Park",
    "Nea Karlsson",
    "Laurie Strode",
    "Ace Visconti",
]

DEFAULT_KILLERS: list[str] = [
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
    real_name: str | None = Field(default="", description="Real name e.g. 'Philip Ojomo'")
    wiki_slug: str | None = ""
    short_name: str | None = ""
    category: str = "Survivor"
    avatar_url: str | None = ""
    avatar_local_path: str | None = ""
    release_number: int | None = None

    model_config = ConfigDict(from_attributes=True)


class ItemModel(BaseModel):
    name: str
    category: str = ""
    role: str | None = "Survivor"
    description: str | None = ""
    icon_url: str | None = ""
    icon_local_path: str | None = ""
    rarity: str | None = ""

    model_config = ConfigDict(from_attributes=True)


class AddonModel(BaseModel):
    name: str
    associated_target: str | None = ""
    category: str | None = ""
    description: str | None = ""
    icon_url: str | None = ""
    icon_local_path: str | None = ""
    rarity: str | None = ""

    model_config = ConfigDict(from_attributes=True)


class MapModel(BaseModel):
    id: str
    name: str
    realm: str
    realm_id: str | None = ""
    callout_image_url: str | None = ""
    callout_image_local_path: str | None = ""
    source: str | None = "hens333"
    source_label: str | None = "Hens333 12-Clock Callouts"
    clock_system: dict[str, Any] | None = None
    tiles: list[dict[str, Any]] | None = Field(default_factory=list)
    objectives: list[dict[str, Any]] | None = Field(default_factory=list)
    totems: list[dict[str, Any]] | None = Field(default_factory=list)
    seed_variant: str | None = "seed_a"
    floor: int | None = 1

    model_config = ConfigDict(from_attributes=True)


class PerkModel(BaseModel):
    name: str
    alternate_name: str | None = ""
    is_generic_counterpart: bool = False
    character: str = "General"
    character_real_name: str | None = "General"
    character_avatar_path: str | None = ""
    category: str = "Survivor"
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""

    model_config = ConfigDict(from_attributes=True)
