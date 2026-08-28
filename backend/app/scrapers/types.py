# backend/app/scrapers/types.py
from dataclasses import asdict, dataclass, field, fields
from typing import Any


@dataclass
class ScraperConfig:
    source: str = "wikigg"
    fallback_to_wiki: bool = False
    last_used_source: str = "wikigg"
    last_run_timestamp: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ScraperConfig":
        if not isinstance(data, dict):
            return cls()
        valid_keys = {f.name for f in fields(cls)}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)


@dataclass
class KillerPowerData:
    name: str = ""
    description: str = ""
    icon_url: str = ""
    icon_local_path: str = ""
    movement_speed: str = ""
    terror_radius: str = ""
    terror_radius_meters: int | None = None
    height: str = ""


@dataclass
class CharacterData:
    name: str
    real_name: str
    wiki_slug: str
    short_name: str
    category: str
    avatar_url: str
    avatar_local_path: str
    release_number: int = 0
    code_prefix: str | None = None
    chapter_name: str | None = None
    chapter_number: str | None = None
    dlc_type: str | None = None
    is_licensed: bool = False
    release_year: int | None = None
    release_date: str | None = None
    dlc_counterparts: str | None = None
    lore: str | None = None
    power: KillerPowerData | None = None
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class ItemData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class AddonData:
    name: str
    associated_target: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class OfferingData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class PerkData:
    name: str
    character: str
    character_real_name: str
    character_avatar_path: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    alternate_name: str | None = None
    is_generic_counterpart: bool = False
    translations: dict[str, dict[str, Any]] = field(default_factory=dict)


@dataclass
class MapData:
    id: str
    name: str
    realm: str
    realm_id: str
    callout_image_url: str
    callout_image_local_path: str
    dpath: str
    clock_system: dict[str, Any]
    source: str = "hens333"
    source_label: str = "Hens333 12-Clock Callouts"
