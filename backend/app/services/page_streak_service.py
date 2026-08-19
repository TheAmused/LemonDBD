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
    fetch_run,
    get_configured_perks_per_page,
    get_owned_killers_ordered,
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

    def get_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return fetch_run(user_id, killer)

    def start_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return create_new_run(user_id, killer, self.get_killers, self.build_pages)

    def expected_build_size(self, page_perks: List[str]) -> int:
        return min(BUILD_SIZE, len(page_perks))

    def submit_result(self, user_id: int, killer: str, page: int, perks: List[str], result: str) -> Optional[Dict[str, Any]]:
        return record_match_result(user_id, killer, page, perks, result)

    def reset_run(self, user_id: int, killer: str) -> Optional[Dict[str, Any]]:
        return reset_active_run(user_id, killer, self.build_pages)

