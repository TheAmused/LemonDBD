import logging
from pathlib import Path
from typing import Any

from app.services.perks import (
    AddonModel,
    CharacterModel,
    ItemModel,
    MapModel,
    PerkModel,
    clean_description as _clean_description_fn,
    fetch_addons as _fetch_addons_fn,
    fetch_character_detail as _fetch_character_detail_fn,
    fetch_character_suggestions as _fetch_character_suggestions_fn,
    fetch_characters as _fetch_characters_fn,
    fetch_items as _fetch_items_fn,
    fetch_map_detail as _fetch_map_detail_fn,
    fetch_maps as _fetch_maps_fn,
    fetch_perk_by_identifier as _fetch_perk_by_identifier_fn,
    fetch_perk_suggestions as _fetch_perk_suggestions_fn,
    fetch_perks as _fetch_perks_fn,
    fetch_perks_fallback as _fetch_perks_fallback_fn,
    load_fallback_files as _load_fallback_files_fn,
    reload_service_data as _reload_service_data_fn,
    sanitize_name as _sanitize_name_fn,
    seed_database_from_json_files as _seed_database_from_json_files_fn,
    slugify as _slugify_fn,
)

logger = logging.getLogger(__name__)

__all__ = [
    "PerkService",
    "CharacterModel",
    "PerkModel",
    "ItemModel",
    "AddonModel",
    "MapModel",
]


class PerkService:
    ALLOWED_SORT_FIELDS: set[str] = {"name", "character", "category"}

    def __init__(self, data_path: Path | None = None):
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent.parent / "data" / "perks.json"
        self.data_path = Path(data_path)
        self.characters_path = self.data_path.parent / "characters.json"
        self.items_path = self.data_path.parent / "items.json"
        self.addons_path = self.data_path.parent / "addons.json"
        self.maps_path = self.data_path.parent / "maps.json"

        self._cache: list[dict[str, Any]] = []
        self._characters_cache: list[dict[str, Any]] = []
        self._items_cache: list[Any] = []
        self._addons_cache: list[Any] = []
        self._maps_cache: list[dict[str, Any]] = []

        self.reload_data()

    @staticmethod
    def _sanitize_name(name: str) -> str:
        return _sanitize_name_fn(name)

    @staticmethod
    def _slugify(text: str) -> str:
        return _slugify_fn(text)

    @staticmethod
    def clean_description(text: str) -> str:
        return _clean_description_fn(text)

    def reload_data(self) -> None:
        _reload_service_data_fn(self)

    def _seed_database_from_json_files(self) -> None:
        _seed_database_from_json_files_fn(self)

    def _load_fallback_files(self) -> None:
        _load_fallback_files_fn(self)

    def get_perks(
        self,
        category: str | None = None,
        character: str | None = None,
        scope: str | None = None,
        search: str | None = None,
        sort_by: str = "name",
        order: str = "asc",
        page: int = 1,
        limit: int = 50,
        user_id: int | None = None,
        owned_only: bool = False,
        lang: str | None = None,
    ) -> dict[str, Any]:
        return _fetch_perks_fn(
            self,
            category=category,
            character=character,
            scope=scope,
            search=search,
            sort_by=sort_by,
            order=order,
            page=page,
            limit=limit,
            user_id=user_id,
            owned_only=owned_only,
            lang=lang,
        )

    def _get_perks_fallback(
        self,
        category: str | None,
        character: str | None,
        scope: str | None,
        search: str | None,
        sort_by: str,
        order: str,
        page: int,
        limit: int,
    ) -> dict[str, Any]:
        return _fetch_perks_fallback_fn(
            self,
            category=category,
            character=character,
            scope=scope,
            search=search,
            sort_by=sort_by,
            order=order,
            page=page,
            limit=limit,
        )

    def get_perk_suggestions(
        self,
        query: str = "",
        category: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        return _fetch_perk_suggestions_fn(self, query=query, category=category, limit=limit)

    def get_character_suggestions(
        self,
        query: str = "",
        category: str | None = None,
        limit: int = 15,
    ) -> list[dict[str, Any]]:
        return _fetch_character_suggestions_fn(self, query=query, category=category, limit=limit)

    def get_by_identifier(self, identifier: str, lang: str | None = None) -> dict[str, Any] | None:
        return _fetch_perk_by_identifier_fn(self, identifier, lang=lang)

    def get_characters(self, category: str | None = None, lang: str | None = None) -> list[dict[str, Any]]:
        return _fetch_characters_fn(self, category, lang=lang)

    def get_character_detail(self, character_name: str, lang: str | None = None) -> dict[str, Any] | None:
        return _fetch_character_detail_fn(self, character_name, lang=lang)

    def get_items(
        self,
        category: str | None = None,
        search: str | None = None,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        return _fetch_items_fn(self, category=category, search=search, lang=lang)

    def get_addons(
        self,
        category: str | None = None,
        target: str | None = None,
        search: str | None = None,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        return _fetch_addons_fn(self, category=category, target=target, search=search, lang=lang)

    def get_maps(
        self,
        realm: str | None = None,
        search: str | None = None,
        source: str | None = None,
    ) -> list[dict[str, Any]]:
        return _fetch_maps_fn(self, realm=realm, search=search, source=source)

    def get_map_detail(
        self,
        map_id: str,
        seed: str | None = None,
        floor: int | None = None,
    ) -> dict[str, Any] | None:
        return _fetch_map_detail_fn(self, map_id=map_id, seed=seed, floor=floor)