# backend/app/services/map_service.py
import logging
from typing import Any

from app.services.db_service import DatabaseService
from app.services.maps import (
    fetch_map_by_id,
    fetch_maps,
    fetch_realms,
    seed_maps_if_empty,
)

logger = logging.getLogger(__name__)


class MapService:
    def __init__(self, db_service: DatabaseService | None = None):
        self._use_sqlalchemy = db_service is None
        self.db_service = db_service or DatabaseService()

    def _seed_db_if_empty(self, conn) -> None:
        seed_maps_if_empty(conn, self.db_service)

    def get_maps(
        self,
        realm: str | None = None,
        search: str | None = None,
        source: str | None = None,
    ) -> list[dict[str, Any]]:
        return fetch_maps(self._use_sqlalchemy, self.db_service, realm=realm, search=search, source=source)

    def get_map_by_id(
        self,
        map_id: str,
        seed_variant: str = "seed_a",
        floor: int = 1,
    ) -> dict[str, Any] | None:
        return fetch_map_by_id(self._use_sqlalchemy, self.db_service, map_id, seed_variant=seed_variant, floor=floor)

    def get_realms(self) -> list[dict[str, Any]]:
        return fetch_realms()
