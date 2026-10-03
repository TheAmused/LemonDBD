# backend/app/services/chaos_service.py
import logging

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun
from app.schemas.chaos import ChaosMatchLogDict, ChaosRunState
from app.schemas.streak import ChallengeCompletionDict, StreakStats
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.chaos import (
    checkpoint_interval,
    draw_addon_rarities,
    draw_chaos_perks,
    fetch_chaos_user_stats,
    get_owned_killer_ids,
    get_unlocked_killer_perk_ids,
    resolve_killer_names_by_ids,
    resolve_perk_names_by_ids,
    resolve_perks_by_ids,
)
from app.services.ownership_service import OwnershipService
from app.services.streak_run import StreakRunService

logger = logging.getLogger(__name__)


class ChaosService(StreakRunService):
    mode = "chaos"
    run_model = ChaosRun
    variant_fields = ("difficulty",)

    def __init__(self, ownership_service: OwnershipService | None = None):
        self.ownership_service = ownership_service or OwnershipService()

    def _freeze_pools(self, r: ChaosRun) -> None:
        r.owned_killer_ids = get_owned_killer_ids(r.user_id, self.ownership_service)
        r.unlocked_perk_ids = get_unlocked_killer_perk_ids(r.user_id, self.ownership_service)

    def _freeze_pools_if_needed(self, r: ChaosRun) -> None:
        self._freeze_if_empty(
            r, "owned_killer_ids", lambda: get_owned_killer_ids(r.user_id, self.ownership_service)
        )
        self._freeze_if_empty(
            r, "unlocked_perk_ids", lambda: get_unlocked_killer_perk_ids(r.user_id, self.ownership_service)
        )

    def _state(self, r: ChaosRun) -> ChaosRunState:
        data = r.to_dict()
        killer_ids = data["owned_killer_ids"]
        perk_ids = data["unlocked_perk_ids"]
        pool_frozen = bool(killer_ids) and bool(perk_ids)
        if not killer_ids:
            killer_ids = get_owned_killer_ids(r.user_id, self.ownership_service)
        if not perk_ids:
            perk_ids = get_unlocked_killer_perk_ids(r.user_id, self.ownership_service)
        return {
            **data,
            "pool_frozen": pool_frozen,
            "owned_killers": resolve_killer_names_by_ids(killer_ids),
            "unlocked_perks": resolve_perk_names_by_ids(perk_ids),
            "checkpoint_interval": checkpoint_interval(r.difficulty),
        }

    def _draw_build(self, unlocked_perks, used_perk_names):
        perks, updated_used = draw_chaos_perks(unlocked_perks, used_perk_names)
        addon_rarities = draw_addon_rarities()
        return perks, updated_used, addon_rarities

    def _redraw_and_maybe_refreeze(self, r: ChaosRun, used_perks, streak_after: int) -> None:
        unlocked_detail = resolve_perks_by_ids(r.unlocked_perk_ids)
        new_perks, updated_used, addon_rarities = self._draw_build(unlocked_detail, used_perks)
        r.used_perks = updated_used
        r.current_perks = new_perks
        r.current_addon_rarities = addon_rarities
        r.perks_revealed = False
        if streak_after == 0:
            self._freeze_pools(r)

    def _compute_loss_outcome(self, r: ChaosRun):
        last_checkpoint = r.last_checkpoint_streak
        interval = checkpoint_interval(r.difficulty)

        if interval > 0:
            streak_after = last_checkpoint
            completed = r.checkpoint_killers
            used_perks = r.checkpoint_used_perks
            checkpoint_killers = list(completed)
            checkpoint_used_perks = list(used_perks)
        else:
            streak_after = 0
            completed = []
            used_perks = []
            last_checkpoint = 0
            checkpoint_killers = []
            checkpoint_used_perks = []

        return streak_after, completed, used_perks, last_checkpoint, checkpoint_killers, checkpoint_used_perks

    def get_or_create_run(self, user_id: int, difficulty: str) -> ChaosRunState:
        return self._get_or_create_run(user_id, difficulty)

    def _present(self, run: ChaosRun) -> ChaosRunState:
        return self._state(run)

    def _build_run(self, user_id: int, difficulty: str) -> ChaosRun:
        live_owned_ids = get_owned_killer_ids(user_id, self.ownership_service)
        live_unlocked_ids = get_unlocked_killer_perk_ids(user_id, self.ownership_service)

        new_run = ChaosRun(
            user_id=user_id,
            difficulty=difficulty,
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers=[],
            checkpoint_killers=[],
            checkpoint_used_perks=[],
            owned_killer_ids=live_owned_ids,
            unlocked_perk_ids=live_unlocked_ids,
            perks_revealed=False,
        )
        unlocked_detail = resolve_perks_by_ids(live_unlocked_ids)
        perks, used_perks, addon_rarities = self._draw_build(unlocked_detail, [])
        new_run.used_perks = used_perks
        new_run.current_perks = perks
        new_run.current_addon_rarities = addon_rarities
        return new_run

    def reveal(self, user_id: int, run_id: int) -> ChaosRunState:
        r = self._find_run_by_id(user_id, run_id)
        if not r:
            raise ValueError("Run not found")
        self._freeze_pools_if_needed(r)
        r.perks_revealed = True
        db.session.commit()
        return self._state(r)

    def reset_run(self, user_id: int, difficulty: str) -> ChaosRunState:
        return self._reset_run(user_id, difficulty)

    def submit_result(self, user_id: int, run_id: int, result: str, killer_id: str) -> ChaosRunState:
        assert_challenge_mode_enabled("chaos")
        self._validate_killer_submission(result, killer_id)
        r = self._load_run_for_result(user_id, run_id)

        self._freeze_pools_if_needed(r)

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = r.completed_killers
        checkpoint_killers = r.checkpoint_killers
        used_perks = r.used_perks
        checkpoint_used_perks = r.checkpoint_used_perks
        perks_this_round = r.current_perks
        addon_rarities_this_round = r.current_addon_rarities
        interval = checkpoint_interval(r.difficulty)

        if result == "win":
            if killer_id in completed:
                raise ValueError(f"{killer_id} has already been cleared this run")
            streak_after = current_streak + 1
            best_after = max(best_streak, streak_after)
            completed.append(killer_id)
            if interval > 0 and streak_after % interval == 0:
                last_checkpoint = streak_after
                checkpoint_killers = list(completed)
                checkpoint_used_perks = list(used_perks)
        else:
            best_after = best_streak
            (
                streak_after,
                completed,
                used_perks,
                last_checkpoint,
                checkpoint_killers,
                checkpoint_used_perks,
            ) = self._compute_loss_outcome(r)
            r.attempts += 1

        db.session.add(ChaosMatchLog(
            run_id=run_id,
            killer_id=killer_id,
            result=result,
            perks=perks_this_round,
            addon_rarities=addon_rarities_this_round,
            streak_before=current_streak,
            streak_after=streak_after,
        ))

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers = completed
        r.checkpoint_killers = checkpoint_killers
        r.checkpoint_used_perks = checkpoint_used_perks

        owned_ids = r.owned_killer_ids
        owned_names = resolve_killer_names_by_ids(owned_ids)
        if result == "win" and owned_names and all(name in completed for name in owned_names):
            r.status = "completed"
            r.used_perks = used_perks
            self._complete_run(r, user_id, r.difficulty, owned_ids, role="Killer")
            self._freeze_pools(r)
        else:
            self._redraw_and_maybe_refreeze(r, used_perks, streak_after)
        db.session.commit()

        return self._state(r)

    def apply_inactivity_loss(self, run_id: int) -> None:
        r = self._load_run_for_inactivity(run_id)
        if not r:
            return

        self._freeze_pools_if_needed(r)

        current_streak = r.current_streak
        (
            streak_after,
            completed,
            used_perks,
            last_checkpoint,
            checkpoint_killers,
            checkpoint_used_perks,
        ) = self._compute_loss_outcome(r)

        db.session.add(ChaosMatchLog(
            run_id=run_id,
            killer_id="",
            result="loss",
            perks=r.current_perks,
            addon_rarities=r.current_addon_rarities,
            streak_before=current_streak,
            streak_after=streak_after,
            triggered_by="inactivity",
        ))

        r.current_streak = streak_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers = completed
        r.checkpoint_killers = checkpoint_killers
        r.checkpoint_used_perks = checkpoint_used_perks
        r.attempts += 1

        self._redraw_and_maybe_refreeze(r, used_perks, streak_after)
        db.session.commit()

    def get_stats(self, user_id: int, difficulty: str) -> StreakStats[ChaosMatchLogDict]:
        return fetch_chaos_user_stats(user_id, difficulty)

    def get_completions(self, user_id: int, difficulty: str) -> list[ChallengeCompletionDict]:
        return self._completions(user_id, difficulty)
