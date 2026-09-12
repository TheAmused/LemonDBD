# backend/app/services/map_service.py
import logging
from typing import Any

from app.services.db_service import DatabaseService
from app.services.maps import (
    fetch_map_by_id,
    fetch_maps,
    fetch_realms,
)

logger = logging.getLogger(__name__)


class MapService:
    def __init__(self, db_service: DatabaseService | None = None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def get_maps(
        self,
        realm: str | None = None,
        search: str | None = None,
        source: str | None = None,
        lang: str | None = None,
    ) -> list[dict[str, Any]]:
        return fetch_maps(self._use_sqlalchemy, self.db_service, realm=realm, search=search, source=source, lang=lang)

    def get_map_by_id(
        self,
        map_id: str,
        seed_variant: str = "seed_a",
        floor: int = 1,
        lang: str | None = None,
    ) -> dict[str, Any] | None:
        """Look one map up by the `<string:map_id>` route parameter.

        The parameter keeps its name and its string type because the route
        does, but `map_realms.map_id` no longer exists: a numeric value is the
        integer primary key and anything else is matched against the map's
        name, which is unique across all 58.
        """
        return fetch_map_by_id(
            self._use_sqlalchemy, self.db_service, map_id, seed_variant=seed_variant, floor=floor, lang=lang
        )

    def get_realms(self, lang: str | None = None) -> list[dict[str, Any]]:
        return fetch_realms(lang=lang)
