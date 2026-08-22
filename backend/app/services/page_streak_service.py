# backend/app/services/page_streak_service.py
import logging
from typing import Any, Dict, List, Optional

from app.services.ownership_service import OwnershipService
from app.services.page_streak import (
    BUILD_SIZE,
    DEFAULT_PERKS_PER_PAGE,
    GENERAL_CHARACTER,
    build_roster_summary,
    build_user_perk_pages,
    create_new_run,
    fetch_page_streak_user_stats,
    fetch_run,
    get_configured_perks_per_page,
    get_killer_avatar_map,
    get_owned_killers_ordered,
    get_perk_icon_map,
    get_user_killer_pool,
    record_match_result,
    reset_active_run,
)
from app.services.perk_service import PerkService

logger = logging.getLogger(__name__)


class PageStreakService:
    def __init__(self, perk_service: Optional[PerkService] = None, ownership_service: Optional[OwnershipService] = None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    def get_perks_per_page(self) -> int:
        return get_configured_perks_per_page()

    def get_pool(self, user_id: int) -> List[Dict[str, Any]]:
        return get_user_killer_pool(user_id, self.perk_service, self.ownership_service)

    def build_pages(self, user_id: int) -> List[List[str]]:
        return build_user_perk_pages(user_id, self.perk_service, self.ownership_service)

    def get_killers(self, user_id: int) -> List[str]:
        return get_owned_killers_ordered(user_id, self.perk_service, self.ownership_service)

    def get_roster(self, user_id: int) -> List[Dict[str, Any]]:
        return build_roster_summary(user_id, self.perk_service, self.ownership_service, self.build_pages)

    def _with_artwork(self, user_id: int, data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Attaches perk icon paths and this run's killer avatar so the
        frontend can render images straight from the run response instead
        of a separate, easy-to-break catalog fetch of its own."""
        if data is None:
            return None
        data["perk_icons"] = get_perk_icon_map(user_id, self.perk_service, self.ownership_service)
        data["killer_avatar"] = get_killer_avatar_map(user_id, self.ownership_service).get(data["killer"])
        return data

    def get_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return self._with_artwork(user_id, fetch_run(user_id, killer))

    def start_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return self._with_artwork(user_id, create_new_run(user_id, killer, self.get_killers, self.build_pages))

    def expected_build_size(self, page_perks: List[str]) -> int:
        return min(BUILD_SIZE, len(page_perks))

    def submit_result(self, user_id: int, killer: str, page: int, perks: List[str], result: str) -> Optional[Dict[str, Any]]:
        return self._with_artwork(user_id, record_match_result(user_id, killer, page, perks, result))

    def reset_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return self._with_artwork(user_id, reset_active_run(user_id, killer, self.build_pages))

    def get_stats(self, user_id: int) -> Dict[str, Any]:
        return fetch_page_streak_user_stats(user_id)

