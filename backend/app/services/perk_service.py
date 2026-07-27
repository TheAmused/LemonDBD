import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CharacterModel(BaseModel):
    name: str = Field(..., description="Canonical title e.g. 'Meg Thomas' or 'The Wraith'")
    real_name: str = Field(..., description="Real name e.g. 'Philip Ojomo'")
    wiki_slug: Optional[str] = ""
    short_name: Optional[str] = ""
    category: str
    avatar_url: Optional[str] = ""
    avatar_local_path: Optional[str] = ""


class PerkModel(BaseModel):
    name: str
    character: str
    character_real_name: Optional[str] = "General"
    character_avatar_path: Optional[str] = ""
    category: str
    description: str
    icon_url: str
    icon_local_path: str


class PerkService:
    ALLOWED_SORT_FIELDS = {"name", "character", "category"}

    def __init__(self, data_path: Optional[Path] = None):
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent.parent / "data" / "perks.json"
        self.data_path = Path(data_path)
        self.characters_path = self.data_path.parent / "characters.json"

        self._cache: List[PerkModel] = []
        self._characters_cache: List[CharacterModel] = []
        self.reload_data()

    @staticmethod
    def _sanitize_name(name: str) -> str:
        clean_str = name.lower().strip()
        clean_str = re.sub(r"[\s\-/]+", "_", clean_str)
        clean_str = re.sub(r'[\\/*?:"<>|]', "", clean_str)
        clean_str = re.sub(r"_+", "_", clean_str)
        return clean_str.strip("_")

    def reload_data(self) -> None:
        if self.characters_path.exists():
            try:
                with open(self.characters_path, "r", encoding="utf-8") as f:
                    c_raw = json.load(f)
                    self._characters_cache = [CharacterModel(**c) for c in c_raw]
                logger.info(f"Loaded {len(self._characters_cache)} character records.")
            except Exception as e:
                logger.error(f"Failed loading characters JSON: {e}")
                self._characters_cache = []

        char_avatar_lookup = {c.name.lower(): c.avatar_local_path for c in self._characters_cache if c.avatar_local_path}

        if self.data_path.exists():
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    parsed_perks = []
                    for item in raw_data:
                        perk = PerkModel(**item)

                        # Auto-link missing avatar paths in memory
                        if not perk.character_avatar_path and perk.character and perk.character != "General":
                            matched_avatar = char_avatar_lookup.get(perk.character.lower())
                            if matched_avatar:
                                perk.character_avatar_path = matched_avatar
                            else:
                                sub_dir = "survivors" if perk.category == "Survivor" else "killers"
                                sanitized = self._sanitize_name(perk.character)
                                perk.character_avatar_path = f"avatars/{sub_dir}/{sanitized}.png"

                        parsed_perks.append(perk)

                    self._cache = parsed_perks
                logger.info(f"Loaded {len(self._cache)} validated perks into memory.")
            except Exception as e:
                logger.error(f"Failed loading perks JSON dataset: {e}")
                self._cache = []

    @staticmethod
    def _slugify(text: str) -> str:
        return re.sub(r"[\s\-/]+", "_", text.lower().strip())

    def get_perks(
        self,
        category: Optional[str] = None,
        character: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        order: str = "asc",
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        results = self._cache

        if category and category.lower() != "all":
            results = [p for p in results if p.category.lower() == category.lower()]

        if character and character.lower() != "all":
            results = [p for p in results if p.character.lower() == character.lower()]

        if search:
            query = search.lower().strip()
            results = [
                p for p in results
                if query in p.name.lower()
                or query in p.description.lower()
                or query in p.character.lower()
                or (p.character_real_name and query in p.character_real_name.lower())
            ]

        valid_sort_field = sort_by.lower() if sort_by.lower() in self.ALLOWED_SORT_FIELDS else "name"
        reverse = (order.lower() == "desc")

        results = sorted(
            results,
            key=lambda x: getattr(x, valid_sort_field).lower(),
            reverse=reverse,
        )

        total_count = len(results)
        page = max(1, page)
        limit = max(1, min(limit, 200))
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_data = [p.model_dump() for p in results[start_idx:end_idx]]

        return {
            "data": paginated_data,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": end_idx < total_count,
                "has_prev": page > 1,
            },
            "filters": {
                "category": category or "all",
                "character": character or "all",
                "search": search or "",
                "sort_by": valid_sort_field,
                "order": "desc" if reverse else "asc",
            },
        }

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        target = identifier.lower().strip()
        for perk in self._cache:
            if perk.name.lower().strip() == target or self._slugify(perk.name) == target:
                return perk.model_dump()
        return None

    def get_characters(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        results = self._characters_cache

        if not results and self._cache:
            char_map: Dict[str, Dict[str, Any]] = {}
            for perk in self._cache:
                if perk.character and perk.character != "General":
                    key = perk.character.lower().strip()
                    if key not in char_map:
                        char_map[key] = {
                            "name": perk.character,
                            "real_name": perk.character_real_name or perk.character,
                            "short_name": perk.character.lower().strip(),
                            "wiki_slug": self._slugify(perk.character),
                            "category": perk.category,
                            "avatar_url": "",
                            "avatar_local_path": perk.character_avatar_path or "",
                        }
            results = [CharacterModel(**c) for c in char_map.values()]

        if category and category.lower() != "all":
            results = [c for c in results if c.category.lower() == category.lower()]
        return [c.model_dump() for c in sorted(results, key=lambda x: x.name)]