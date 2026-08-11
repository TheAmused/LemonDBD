from app.services.scraper_service import ScraperService
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


class ItemModel(BaseModel):
    name: str
    category: str
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
        self.items_path = self.data_path.parent / "items.json"
        self.addons_path = self.data_path.parent / "addons.json"

        self._cache: List[PerkModel] = []
        self._characters_cache: List[CharacterModel] = []
        self._items_cache: List[ItemModel] = []
        self._addons_cache: List[AddonModel] = []
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

        if self.items_path.exists():
            try:
                with open(self.items_path, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)
                    parsed_items = []
                    for item in raw_items:
                        item_obj = ItemModel(**item)
                        if item_obj.description:
                            item_obj.description = ScraperService.clean_description_text(item_obj.description)
                        parsed_items.append(item_obj)
                    self._items_cache = parsed_items
                logger.info(f"Loaded {len(self._items_cache)} items.")
            except Exception as e:
                logger.error(f"Failed loading items JSON: {e}")
                self._items_cache = []
        else:
            self._items_cache = []

        if self.addons_path.exists():
            try:
                with open(self.addons_path, "r", encoding="utf-8") as f:
                    raw_addons = json.load(f)
                    parsed_addons = []
                    for addon in raw_addons:
                        addon_obj = AddonModel(**addon)
                        if addon_obj.description:
                            addon_obj.description = ScraperService.clean_description_text(addon_obj.description)
                        parsed_addons.append(addon_obj)
                    self._addons_cache = parsed_addons
                logger.info(f"Loaded {len(self._addons_cache)} addons.")
            except Exception as e:
                logger.error(f"Failed loading addons JSON: {e}")
                self._addons_cache = []
        else:
            self._addons_cache = []

        if self.data_path.exists():
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    parsed_perks = []
                    for item in raw_data:
                        perk = PerkModel(**item)
                        if perk.description:
                            perk.description = ScraperService.clean_description_text(perk.description)

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
    def get_items(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = self._items_cache

        if category and category.lower() != "all":
            results = [item for item in results if item.category and item.category.lower() == category.lower()]

        if search:
            query = search.lower().strip()
            results = [
                item for item in results
                if (item.name and query in item.name.lower())
                or (item.description and query in item.description.lower())
                or (item.category and query in item.category.lower())
                or (item.role and query in item.role.lower())
            ]

        return [item.model_dump() for item in results]

    def get_addons(
        self,
        category: Optional[str] = None,
        target: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = self._addons_cache

        if category and category.lower() != "all":
            results = [addon for addon in results if addon.category and addon.category.lower() == category.lower()]

        if target and target.lower() != "all":
            results = [
                addon for addon in results
                if addon.associated_target and addon.associated_target.lower() == target.lower()
            ]

        if search:
            query = search.lower().strip()
            results = [
                addon for addon in results
                if (addon.name and query in addon.name.lower())
                or (addon.description and query in addon.description.lower())
                or (addon.category and query in addon.category.lower())
                or (addon.associated_target and query in addon.associated_target.lower())
            ]

        return [addon.model_dump() for addon in results]


    def get_character_detail(self, character_name: str) -> Optional[Dict[str, Any]]:
        target_clean = character_name.strip().lower()
        target_slug = self._slugify(character_name)

        all_chars = self.get_characters()
        matched_char = None
        for c in all_chars:
            if (
                c.get("name", "").lower() == target_clean
                or c.get("real_name", "").lower() == target_clean
                or c.get("wiki_slug", "").lower() == target_slug
                or c.get("short_name", "").lower() == target_clean
            ):
                matched_char = c
                break

        if not matched_char:
            return None

        char_canonical_name = matched_char["name"]

        matched_perks = [
            p.model_dump()
            for p in self._cache
            if p.character and (
                p.character.lower() == char_canonical_name.lower()
                or p.character.lower() == target_clean
            )
        ]

        matched_addons = [
            a.model_dump()
            for a in self._addons_cache
            if a.associated_target and (
                a.associated_target.lower() == char_canonical_name.lower()
                or a.associated_target.lower() == target_clean
            )
        ]

        matched_items = [
            item.model_dump()
            for item in self._items_cache
            if (
                (item.role and item.role.lower() == matched_char.get("category", "").lower())
                or (item.category and item.category.lower() == matched_char.get("category", "").lower())
            )
        ]

        return {
            "character": matched_char,
            "perks": matched_perks,
            "addons": matched_addons,
            "items": matched_items,
        }
