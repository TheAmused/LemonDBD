# backend/app/services/page_streak_service.py
import logging
from typing import Any

from app.schemas.page_streak import PageStreakRunDict, PageStreakRunState, PageStreakStatsLog
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, fetch_completed_variants
from app.services.ownership_service import OwnershipService
from app.services.page_streak import (
    BUILD_SIZE,
    build_roster_summary,
    build_user_perk_pages,
    create_new_run,
    fetch_page_streak_user_stats,
    fetch_run,
    get_configured_perks_per_page,
    get_killer_avatar_map,
    get_live_roster_badge,
    get_owned_killers_ordered,
    get_perk_icon_map,
    get_user_killer_pool,
    record_match_result,
    reset_active_run,
    reset_all_runs,
)
from app.services.perk_service import PerkService

logger = logging.getLogger(__name__)


class PageStreakService:
    def __init__(self, perk_service: PerkService | None = None, ownership_service: OwnershipService | None = None):
        self.perk_service = perk_service or PerkService()
        self.ownership_service = ownership_service or OwnershipService()

    def get_perks_per_page(self) -> int:
        return get_configured_perks_per_page()

    def get_pool(self, user_id: int) -> list[dict[str, Any]]:
        return get_user_killer_pool(user_id, self.perk_service, self.ownership_service)

    def build_pages(self, user_id: int) -> list[list[str]]:
        return build_user_perk_pages(user_id, self.perk_service, self.ownership_service)

    def get_killers(self, user_id: int) -> list[str]:
        return get_owned_killers_ordered(user_id, self.perk_service, self.ownership_service)

    def get_roster(self, user_id: int) -> list[dict[str, Any]]:
        return build_roster_summary(user_id, self.perk_service, self.ownership_service, self.build_pages)

    def get_roster_with_milestone(self, user_id: int) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Roster list plus the live mode-wide badge, sharing a single
        completions fetch instead of each querying it separately."""
        completed = fetch_completed_variants(user_id, "page_streak")
        roster = build_roster_summary(
            user_id, self.perk_service, self.ownership_service, self.build_pages, completed_killers=completed
        )
        badge = get_live_roster_badge(user_id, self.ownership_service, completed_killers=completed)
        return roster, badge

    def get_roster_milestone(self, user_id: int) -> dict[str, Any]:
        return get_live_roster_badge(user_id, self.ownership_service)

    def _with_artwork(self, user_id: int, data: PageStreakRunDict | None) -> PageStreakRunState | None:
        if data is None:
            return None
        return {
            **data,
            "perk_icons": get_perk_icon_map(user_id, self.perk_service, self.ownership_service),
            "killer_avatar": get_killer_avatar_map(user_id, self.ownership_service).get(data["killer"]),
        }

    def get_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        return self._with_artwork(user_id, fetch_run(user_id, killer, self.build_pages))

    def start_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak")
        return self._with_artwork(user_id, create_new_run(user_id, killer, self.get_killers, self.build_pages))

    def expected_build_size(self, page_perks: list[str]) -> int:
        return min(BUILD_SIZE, len(page_perks))

    def submit_result(self, user_id: int, killer: str, page: int, perks: list[str], result: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak")
        run = record_match_result(user_id, killer, page, perks, result, self.build_pages)
        return self._with_artwork(user_id, run)

    def reset_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak")
        return self._with_artwork(user_id, reset_active_run(user_id, killer, self.build_pages))

    def reset_all(self, user_id: int) -> None:
        assert_challenge_mode_enabled("page_streak")
        reset_all_runs(user_id)

    def get_stats(self, user_id: int) -> StreakStats[PageStreakStatsLog]:
        return fetch_page_streak_user_stats(user_id)

    def get_completions(self, user_id: int, killer: str) -> list[ChallengeCompletionDict]:
        return fetch_challenge_completions(user_id, "page_streak", killer)
