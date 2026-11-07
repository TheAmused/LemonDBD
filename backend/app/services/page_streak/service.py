# backend/app/services/page_streak/service.py
import logging
from typing import Any

from app.core.errors import NotFoundError
from app.schemas.page_streak import PageStreakRunDict, PageStreakRunState, PageStreakStatsLog
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, fetch_completed_pages
from app.services.ownership_service import OwnershipService
from app.services.page_streak.helpers import BUILD_SIZE
from app.services.page_streak.pool import (
    build_user_perk_pages,
    get_configured_perks_per_page,
    get_perk_icon_map,
    get_user_killer_pool,
)
from app.services.page_streak.roster import (
    build_roster_summary,
    get_live_roster_badge,
    get_owned_killers_ordered,
    killer_avatar_map,
)
from app.services.page_streak.runs import (
    abandon_active_run,
    create_new_run,
    fetch_run,
    lock_pages,
    record_match_result,
    abandon_all_runs,
)
from app.services.page_streak.stats import fetch_page_streak_user_stats
from app.services.perks import PerkService

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
        completed = fetch_completed_pages(user_id, "page_streak")
        roster = build_roster_summary(
            user_id, self.perk_service, self.ownership_service, self.build_pages, completed_pages=completed
        )
        badge = get_live_roster_badge(user_id, self.ownership_service, completed_killers=completed)
        return roster, badge

    def get_roster_milestone(self, user_id: int) -> dict[str, Any]:
        return get_live_roster_badge(user_id, self.ownership_service)

    def _killer_characters(self, user_id: int) -> list[dict[str, Any]]:
        return self.ownership_service.get_user_characters(user_id, role="Killer")

    def _with_artwork(
        self, user_id: int, data: PageStreakRunDict | None, killers: list[dict[str, Any]] | None = None
    ) -> PageStreakRunState | None:
        """`killers` is the list a caller already fetched, so one request reads the roster once."""
        if data is None:
            return None
        return {
            **data,
            "perk_icons": get_perk_icon_map(self.perk_service, {name for page in data["pages"] for name in page}),
            "killer_avatar": killer_avatar_map(self._killer_characters(user_id) if killers is None else killers).get(
                data["killer"]
            ),
        }

    def _require_owned_killer(self, user_id: int, killer: str) -> list[dict[str, Any]]:
        """A killer the player does not have (or no longer has) has no run to open, read or play.
        Returns the killers it read, for the artwork lookup that follows."""
        killers = self._killer_characters(user_id)
        if not any(c["name"] == killer and c["is_owned"] and not c.get("is_disabled") for c in killers):
            raise NotFoundError(f"Killer not found: {killer}")
        return killers

    def get_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        killers = self._require_owned_killer(user_id, killer)
        return self._with_artwork(user_id, fetch_run(user_id, killer, self.build_pages), killers)

    def start_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak", user_id)
        return self._with_artwork(user_id, create_new_run(user_id, killer, self.get_killers, self.build_pages))

    def lock_pages(self, user_id: int, killer: str) -> PageStreakRunState | None:
        """The player confirmed a build: the run keeps its pages from now on."""
        assert_challenge_mode_enabled("page_streak", user_id)
        killers = self._require_owned_killer(user_id, killer)
        return self._with_artwork(user_id, lock_pages(user_id, killer, self.build_pages), killers)

    def expected_build_size(self, page_perks: list[str]) -> int:
        return min(BUILD_SIZE, len(page_perks))

    def submit_result(self, user_id: int, killer: str, page: int, perks: list[str], result: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak", user_id)
        killers = self._require_owned_killer(user_id, killer)
        run = record_match_result(user_id, killer, page, perks, result, self.build_pages)
        return self._with_artwork(user_id, run, killers)

    def abandon_run(self, user_id: int, killer: str) -> PageStreakRunState | None:
        assert_challenge_mode_enabled("page_streak", user_id)
        # No ownership check: giving up a run must work for a killer that was disabled or lost since, like abandon_all.
        return self._with_artwork(user_id, abandon_active_run(user_id, killer, self.build_pages))

    def abandon_all(self, user_id: int) -> None:
        assert_challenge_mode_enabled("page_streak", user_id)
        abandon_all_runs(user_id)

    def get_stats(self, user_id: int, killer: str) -> StreakStats[PageStreakStatsLog]:
        return fetch_page_streak_user_stats(user_id, killer)

    def get_completions(self, user_id: int, killer: str) -> list[ChallengeCompletionDict]:
        return fetch_challenge_completions(user_id, "page_streak", killer)
