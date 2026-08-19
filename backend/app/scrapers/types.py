# backend/app/scrapers/types.py
from dataclasses import asdict, dataclass, fields
from typing import Any, Dict, Optional, List


@dataclass
class ScraperConfig:
    source: str = "wikigg"
    fallback_to_wiki: bool = False
    last_used_source: str = "wikigg"
    last_run_timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScraperConfig":
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
    terror_radius_meters: Optional[int] = None
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
    code_prefix: Optional[str] = None
    chapter_name: Optional[str] = None
    chapter_number: Optional[str] = None
    dlc_type: Optional[str] = None
    is_licensed: bool = False
    release_year: Optional[int] = None
    release_date: Optional[str] = None
    dlc_counterparts: Optional[str] = None
    lore: Optional[str] = None
    power: Optional[KillerPowerData] = None


@dataclass
class ItemData:
    name: str
    category: str
    role: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


@dataclass
class AddonData:
    name: str
    associated_target: str
    category: str
    description: str
    icon_url: str
    icon_local_path: str
    rarity: str


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
    alternate_name: Optional[str] = None
    is_generic_counterpart: bool = False


@dataclass
class MapData:
    id: str
    name: str
    realm: str
    realm_id: str
    callout_image_url: str
    callout_image_local_path: str
    dpath: str
    clock_system: Dict[str, Any]
    source: str = "hens333"
    source_label: str = "Hens333 12-Clock Callouts"