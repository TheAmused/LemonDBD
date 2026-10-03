# backend/app/services/perk_service.py
import logging
from pathlib import Path
from typing import Any

from app.services.perks import (
    AddonModel,
    CharacterModel,
    ItemModel,
    MapModel,
    PerkModel,
    fetch_addons as _fetch_addons_fn,
    fetch_character_detail as _fetch_character_detail_fn,
    fetch_character_suggestions as _fetch_character_suggestions_fn,
    fetch_characters as _fetch_characters_fn,
    fetch_items as _fetch_items_fn,
    fetch_maps as _fetch_maps_fn,
    fetch_perk_by_identifier as _fetch_perk_by_identifier_fn,
    fetch_perk_suggestions as _fetch_perk_suggestions_fn,
    fetch_perks as _fetch_perks_fn,
    reload_service_data as _reload_service_data_fn,
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

    def reload_data(self) -> None:
        _reload_service_data_fn(self)

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

    def get_perk_suggestions(
        self,
        query: str = "",
        category: str | None = None,
        limit: int = 10,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        return _fetch_perk_suggestions_fn(self, query=query, category=category, limit=limit, lang=lang)

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
        """Serve `/api/v1/addons` as one list drawn from two tables.

        `category` and `target` keep their meanings and their spellings; they
        now choose between `killer_addons` and `item_addons` rather than
        filtering one combined table, and the two result sets are concatenated.
        """
        return _fetch_addons_fn(self, category=category, target=target, search=search, lang=lang)

    def get_maps(
        self,
        realm: str | None = None,
        search: str | None = None,
        source: str | None = None,
    ) -> list[dict[str, Any]]:
        return _fetch_maps_fn(self, realm=realm, search=search, source=source)
