# backend/app/services/history_service.py
import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.core.extensions import db
from app.models import HistoryMatchLog, HistoryRun
from app.services.history import fetch_history_user_stats
from app.services.history.roster import (
    ROW_SIZE,
    build_rows,
    get_general_killer_perk_names,
    get_killer_teachable_perk_names,
    get_owned_killer_ids_by_release,
    resolve_killer_names_by_ids,
)
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.ownership_service import OwnershipService

logger = logging.getLogger(__name__)


class HistoryService:
    def __init__(self, ownership_service: Optional[OwnershipService] = None):
        self.ownership_service = ownership_service or OwnershipService()

    def _freeze_pool(self, run: HistoryRun) -> List[str]:
        ids = get_owned_killer_ids_by_release(run.user_id, self.ownership_service)
        run.owned_killers_json = json.dumps(ids)
        return resolve_killer_names_by_ids(ids)

    def _is_unfrozen(self, run: HistoryRun) -> bool:
        """True while the run hasn't genuinely started yet -- row 0, nothing
        beaten -- regardless of whatever owned_killers_json already holds
        (a run created before the pool moved to a real freeze point can carry
        a stale non-empty snapshot from creation time)."""
        if run.current_row_index == 0 and run.total_killers_beaten == 0:
            return True
        return not json.loads(run.owned_killers_json or "[]")

    def _resolve_loss(self, run: HistoryRun):
        """Computes and applies the state a loss resets History progress to:
        medium-mode checkpoint fallback, or a full reset to row 0 (hell mode,
        or medium with no checkpoint banked yet -- the checkpoint fields
        still sit at their creation-time zero defaults in that case, so the
        medium branch below naturally restores to zero too). Mutates run's
        row/checkpoint fields in place, refreezes the roster when the
        resulting state is genuinely zero progress (Task 4's rule), and
        returns (completed, unlocked) for the caller to persist. Shared by
        submit_result's real-match loss branch and apply_inactivity_loss's
        synthetic one, since this exact computation caused the same
        medium-checkpoint-zero-detection bug twice before being unified
        here."""
        if run.mode == "medium":
            run.current_row_index = run.checkpoint_row_index
            run.total_killers_beaten = run.checkpoint_total_killers_beaten
            completed = json.loads(run.checkpoint_completed_killers_json or "[]")
            unlocked = json.loads(run.checkpoint_unlocked_perk_names_json or "[]")
        else:
            general = get_general_killer_perk_names()
            run.current_row_index = 0
            run.total_killers_beaten = 0
            completed = []
            unlocked = general
            run.checkpoint_row_index = 0
            run.checkpoint_total_killers_beaten = 0
            run.checkpoint_completed_killers_json = "[]"
            run.checkpoint_unlocked_perk_names_json = json.dumps(general)

        if run.current_row_index == 0 and run.total_killers_beaten == 0:
            self._freeze_pool(run)

        return completed, unlocked

    def _augment(self, run: HistoryRun) -> Dict[str, Any]:
        if self._is_unfrozen(run):
            owned_names = resolve_killer_names_by_ids(
                get_owned_killer_ids_by_release(run.user_id, self.ownership_service)
            )
        else:
            owned_ids = json.loads(run.owned_killers_json or "[]")
            owned_names = resolve_killer_names_by_ids(owned_ids)
        rows = build_rows(owned_names)

        if run.status == "in_progress" and rows and run.current_row_index >= len(rows):
            run.current_row_index = len(rows) - 1
            run.completed_killers_json = "[]"
            db.session.commit()

        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []

        if current_row:
            completed = json.loads(run.completed_killers_json or "[]")
            filtered = [k for k in completed if k in current_row]
            if filtered != completed:
                run.completed_killers_json = json.dumps(filtered)
                db.session.commit()

        data = run.to_dict()
        data["owned_killers"] = owned_names
        data["current_row_killers"] = current_row
        data["row_size"] = ROW_SIZE
        data["total_rows"] = len(rows)
        data["total_owned_killers"] = len(owned_names)
        return data

    def get_or_create_run(self, user_id: int, mode: str) -> Dict[str, Any]:
        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).first()
        if run:
            return self._augment(run)

        assert_challenge_mode_enabled("history")

        general = get_general_killer_perk_names()
        run = HistoryRun(
            user_id=user_id,
            mode=mode,
            status="in_progress",
            current_row_index=0,
            total_killers_beaten=0,
            best_killers_beaten=0,
            completed_killers_json="[]",
            unlocked_perk_names_json=json.dumps(general),
            checkpoint_row_index=0,
            checkpoint_total_killers_beaten=0,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=json.dumps(general),
        )
        db.session.add(run)
        db.session.commit()
        return self._augment(run)

    def reset_run(self, user_id: int, mode: str) -> Dict[str, Any]:
        assert_challenge_mode_enabled("history")
        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.user_id == user_id, HistoryRun.mode == mode)
        ).first()
        if not run:
            raise ValueError("Run not found")
        db.session.delete(run)
        db.session.commit()
        return self.get_or_create_run(user_id, mode)

    def submit_result(self, user_id: int, run_id: int, result: str, killer_id: str) -> Dict[str, Any]:
        assert_challenge_mode_enabled("history")
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")
        if not killer_id:
            raise ValueError("killer_id is required")

        run = db.session.scalars(
            select(HistoryRun).where(HistoryRun.id == run_id, HistoryRun.user_id == user_id)
        ).first()
        if not run:
            raise ValueError("Run not found")
        if run.status == "completed":
            raise ValueError("This run is already completed. Reset it to play again.")

        if self._is_unfrozen(run):
            self._freeze_pool(run)
        owned_names = resolve_killer_names_by_ids(json.loads(run.owned_killers_json or "[]"))
        rows = build_rows(owned_names)
        current_row = rows[run.current_row_index] if run.current_row_index < len(rows) else []
        if killer_id not in current_row:
            raise ValueError(f"{killer_id} is not in the active row")

        completed = json.loads(run.completed_killers_json or "[]")
        unlocked = json.loads(run.unlocked_perk_names_json or "[]")
        streak_before = run.total_killers_beaten
        row_index_for_log = run.current_row_index
        newly_unlocked: List[str] = []
        row_cleared = False

        if result == "win":
            if killer_id in completed:
                raise ValueError(f"{killer_id} has already been cleared this row")
            completed.append(killer_id)
            newly_unlocked = [
                p for p in get_killer_teachable_perk_names(killer_id) if p not in unlocked
            ]
            unlocked.extend(newly_unlocked)
            run.total_killers_beaten += 1
            run.best_killers_beaten = max(run.best_killers_beaten, run.total_killers_beaten)

            if current_row and set(completed) >= set(current_row):
                row_cleared = True
                run.current_row_index += 1
                completed = []
                if run.current_row_index >= len(rows):
                    run.status = "completed"
                    self._freeze_pool(run)
                if run.mode == "medium":
                    run.checkpoint_row_index = run.current_row_index
                    run.checkpoint_total_killers_beaten = run.total_killers_beaten
                    run.checkpoint_completed_killers_json = "[]"
                    run.checkpoint_unlocked_perk_names_json = json.dumps(unlocked)
        else:
            completed, unlocked = self._resolve_loss(run)

        streak_after = run.total_killers_beaten
        run.completed_killers_json = json.dumps(completed)
        run.unlocked_perk_names_json = json.dumps(unlocked)

        db.session.add(HistoryMatchLog(
            run_id=run_id,
            killer_id=killer_id,
            result=result,
            row_index=row_index_for_log,
            streak_before=streak_before,
            streak_after=streak_after,
        ))
        db.session.commit()

        data = self._augment(run)
        data["newly_unlocked_perks"] = newly_unlocked
        data["row_cleared"] = row_cleared
        return data

    def apply_inactivity_loss(self, run_id: int) -> None:
        """Applies the same state transition submit_result's loss branch
        would, without a killer_id. Used only by the inactivity cleanup job
        (Task 11). A no-op if the run doesn't exist or is already completed."""
        run = db.session.scalars(select(HistoryRun).where(HistoryRun.id == run_id)).first()
        if not run or run.status == "completed":
            return

        streak_before = run.total_killers_beaten
        row_index_for_log = run.current_row_index

        completed, unlocked = self._resolve_loss(run)

        streak_after = run.total_killers_beaten
        run.completed_killers_json = json.dumps(completed)
        run.unlocked_perk_names_json = json.dumps(unlocked)

        db.session.add(HistoryMatchLog(
            run_id=run_id,
            killer_id="",
            result="loss",
            row_index=row_index_for_log,
            streak_before=streak_before,
            streak_after=streak_after,
            triggered_by="inactivity",
        ))
        db.session.commit()

    def get_stats(self, user_id: int, mode: str) -> Dict[str, Any]:
        return fetch_history_user_stats(user_id, mode)
