# backend/app/services/chaos_service.py
import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun
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

logger = logging.getLogger(__name__)


class ChaosService:
    def __init__(self, ownership_service: Optional[OwnershipService] = None):
        self.ownership_service = ownership_service or OwnershipService()

    def _freeze_pools(self, r: ChaosRun) -> None:
        r.owned_killers_json = json.dumps(get_owned_killer_ids(r.user_id, self.ownership_service))
        r.unlocked_perks_json = json.dumps(get_unlocked_killer_perk_ids(r.user_id, self.ownership_service))

    def _with_resolved_pool(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["owned_killers"] = resolve_killer_names_by_ids(data["owned_killer_ids"])
        data["unlocked_perks"] = resolve_perk_names_by_ids(data["unlocked_perk_ids"])
        return data

    def _draw_build(self, unlocked_perks, used_perk_names):
        perks, updated_used = draw_chaos_perks(unlocked_perks, used_perk_names)
        addon_rarities = draw_addon_rarities()
        return perks, updated_used, addon_rarities

    def _redraw_and_maybe_refreeze(self, r: ChaosRun, used_perks, streak_after: int) -> None:
        """Shared tail of a loss (real or inactivity-triggered): redraw
        perks against the frozen pool, and refreeze if the loss reset
        progress all the way to zero. streak_after == 0 only happens on a
        loss (a win always increments it), so this doubles as the
        result == 'loss' check without needing the result string here."""
        unlocked_detail = resolve_perks_by_ids(json.loads(r.unlocked_perks_json or "[]"))
        new_perks, updated_used, addon_rarities = self._draw_build(unlocked_detail, used_perks)
        r.used_perks_json = json.dumps(updated_used)
        r.current_perks_json = json.dumps(new_perks)
        r.current_addon_rarities_json = json.dumps(addon_rarities)
        r.perks_revealed = False
        if streak_after == 0:
            self._freeze_pools(r)

    def _compute_loss_outcome(self, r: ChaosRun):
        """Computes the state a loss resets Chaos progress to: checkpoint
        fallback if this difficulty has one, otherwise reset to zero.
        Read-only -- does not mutate r. Shared by submit_result's real-match
        loss branch and apply_inactivity_loss's synthetic one, since this
        exact computation caused the same checkpoint-zero-detection bug
        class (see History's identical history) when it was duplicated."""
        last_checkpoint = r.last_checkpoint_streak
        interval = checkpoint_interval(r.difficulty)

        if interval > 0:
            streak_after = last_checkpoint
            completed = json.loads(r.checkpoint_killers_json or "[]")
            used_perks = json.loads(r.checkpoint_used_perks_json or "[]")
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

    def get_or_create_run(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(ChaosRun).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
        ).first()
        if run:
            if not json.loads(run.owned_killers_json or "[]") or not json.loads(run.unlocked_perks_json or "[]"):
                self._freeze_pools(run)
                db.session.commit()
            data = self._with_resolved_pool(run.to_dict())
            data["checkpoint_interval"] = checkpoint_interval(difficulty)
            return data

        new_run = ChaosRun(
            user_id=user_id,
            difficulty=difficulty,
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            checkpoint_used_perks_json="[]",
            perks_revealed=False,
        )
        self._freeze_pools(new_run)
        unlocked_detail = resolve_perks_by_ids(json.loads(new_run.unlocked_perks_json))
        perks, used_perks, addon_rarities = self._draw_build(unlocked_detail, [])
        new_run.used_perks_json = json.dumps(used_perks)
        new_run.current_perks_json = json.dumps(perks)
        new_run.current_addon_rarities_json = json.dumps(addon_rarities)
        db.session.add(new_run)
        db.session.commit()

        data = self._with_resolved_pool(new_run.to_dict())
        data["checkpoint_interval"] = checkpoint_interval(difficulty)
        return data

    def reveal(self, user_id: int, run_id: int) -> Dict[str, Any]:
        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.id == run_id, ChaosRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        r.perks_revealed = True
        db.session.commit()
        data = self._with_resolved_pool(r.to_dict())
        data["checkpoint_interval"] = checkpoint_interval(r.difficulty)
        return data

    def reset_run(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.user_id == user_id, ChaosRun.difficulty == difficulty)
        ).first()
        if not r:
            raise ValueError("Run not found")
        db.session.delete(r)
        db.session.commit()
        return self.get_or_create_run(user_id, difficulty)

    def submit_result(self, user_id: int, run_id: int, result: str, killer_id: str) -> Dict[str, Any]:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if not killer_id:
            raise ValueError("killer_id is required")

        r = db.session.scalars(
            select(ChaosRun).where(ChaosRun.id == run_id, ChaosRun.user_id == user_id)
        ).first()
        if not r:
            raise ValueError("Run not found")
        if r.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")

        current_streak = r.current_streak
        best_streak = r.best_streak
        last_checkpoint = r.last_checkpoint_streak
        completed = json.loads(r.completed_killers_json or "[]")
        checkpoint_killers = json.loads(r.checkpoint_killers_json or "[]")
        used_perks = json.loads(r.used_perks_json or "[]")
        checkpoint_used_perks = json.loads(r.checkpoint_used_perks_json or "[]")
        perks_this_round = json.loads(r.current_perks_json or "[]")
        addon_rarities_this_round = json.loads(r.current_addon_rarities_json or "[]")
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

        db.session.add(ChaosMatchLog(
            run_id=run_id,
            killer_id=killer_id,
            result=result,
            perks_json=json.dumps(perks_this_round),
            addon_rarities_json=json.dumps(addon_rarities_this_round),
            streak_before=current_streak,
            streak_after=streak_after,
        ))

        r.current_streak = streak_after
        r.best_streak = best_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers_json = json.dumps(completed)
        r.checkpoint_killers_json = json.dumps(checkpoint_killers)
        r.checkpoint_used_perks_json = json.dumps(checkpoint_used_perks)

        # completed_killers_json stays name-keyed (existing convention), so
        # resolve the frozen id pool to current names before comparing.
        owned_names = resolve_killer_names_by_ids(json.loads(r.owned_killers_json or "[]"))
        if result == "win" and owned_names and all(name in completed for name in owned_names):
            r.status = "completed"
            r.used_perks_json = json.dumps(used_perks)
            self._freeze_pools(r)
        else:
            self._redraw_and_maybe_refreeze(r, used_perks, streak_after)
        db.session.commit()

        data = self._with_resolved_pool(r.to_dict())
        data["checkpoint_interval"] = interval
        return data

    def apply_inactivity_loss(self, run_id: int) -> None:
        """Applies the same state transition submit_result's loss branch
        would, without a killer_id -- there's no real match being played.
        Used only by the inactivity cleanup job (Task 11). A no-op if the
        run doesn't exist or is already completed."""
        r = db.session.scalars(select(ChaosRun).where(ChaosRun.id == run_id)).first()
        if not r or r.status == "completed":
            return

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
            perks_json=r.current_perks_json,
            addon_rarities_json=r.current_addon_rarities_json,
            streak_before=current_streak,
            streak_after=streak_after,
            triggered_by="inactivity",
        ))

        r.current_streak = streak_after
        r.last_checkpoint_streak = last_checkpoint
        r.completed_killers_json = json.dumps(completed)
        r.checkpoint_killers_json = json.dumps(checkpoint_killers)
        r.checkpoint_used_perks_json = json.dumps(checkpoint_used_perks)

        self._redraw_and_maybe_refreeze(r, used_perks, streak_after)
        db.session.commit()

    def get_stats(self, user_id: int, difficulty: str) -> Dict[str, Any]:
        return fetch_chaos_user_stats(user_id, difficulty)
