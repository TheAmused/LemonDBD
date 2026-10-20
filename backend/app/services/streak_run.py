# backend/app/services/streak_run.py
"""Run lifecycle shared by the chaos, gauntlet and history services.

The three modes keep their own run models, win/loss rules and response
payloads. What they repeated verbatim lives here: looking a run up, the
find-or-create flow, abandon, the guards in front of `submit_result`, the
inactivity-loss lookup, lazy pool freezing and the completion record.
"""
from collections.abc import Callable
from datetime import datetime
from typing import Any

from sqlalchemy import inspect as sa_inspect, select

from app.core.extensions import db
from app.core.transaction import end_transaction, lock_for_update, transaction
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, record_challenge_completion
from app.services.roster_milestone import get_full_roster_milestone


#: Run columns that outlive an abandoned run: its identity, its attempt bookkeeping and its lifetime totals.
_KEPT_ON_ABANDON = frozenset({"id", "user_id", "created_at", "updated_at", "attempt", "attempts", "total_wins", "total_losses"})


class StreakRunService:
    #: Challenge mode name ("chaos", "gauntlet", "history").
    mode: str
    run_model: type
    #: Run column holding the best streak, which survives an abandon.
    best_field: str = "best_streak"
    #: Run columns that, with `user_id`, identify one run; the order is the
    #: order of the variant arguments of `get_or_create_run` / `abandon_run`.
    variant_fields: tuple[str, ...]

    # -- lookup -----------------------------------------------------------

    def _find_run(self, user_id: int, *variant: Any, lock: bool = False):
        model = self.run_model
        conditions = [model.user_id == user_id]
        conditions += [getattr(model, field) == value for field, value in zip(self.variant_fields, variant)]
        query = select(model).where(*conditions)
        return db.session.scalars(lock_for_update(query) if lock else query).first()

    def _run_by_id_query(self, user_id: int, run_id: int):
        # Locked, so two parallel requests (a double click, two tabs) cannot both read
        # the same state and each count the same match.
        model = self.run_model
        return lock_for_update(select(model).where(model.id == run_id, model.user_id == user_id))

    def _find_run_by_id(self, user_id: int, run_id: int):
        return db.session.scalars(self._run_by_id_query(user_id, run_id)).first()

    # -- find-or-create / abandon ---------------------------------------------

    def _build_run(self, user_id: int, *variant: Any):
        raise NotImplementedError

    def _present(self, run) -> Any:
        """The response payload for a run."""
        raise NotImplementedError

    def _get_or_create_run(self, user_id: int, *variant: Any):
        run = self._find_run(user_id, *variant)
        if run:
            return self._present(run)

        assert_challenge_mode_enabled(self.mode)

        with transaction():
            run = self._build_run(user_id, *variant)
            db.session.add(run)
        return self._present(run)

    def _abandon_run(self, user_id: int, *variant: Any):
        """Abandon the run in play: back to zero in a new attempt, with every match played so far kept.

        The run row stays, so its match logs do. Its progress is overwritten with what a
        brand new run starts with; the best streak is a record, so it is left alone.
        """
        assert_challenge_mode_enabled(self.mode)
        run = self._find_run(user_id, *variant, lock=True)
        if not run:
            raise ValueError("Run not found")
        with transaction():
            run.abandon_attempt()
            self._reset_to_fresh(run, user_id, *variant)
        return self._present(run)

    def _reset_to_fresh(self, run, user_id: int, *variant: Any) -> None:
        """Overwrite the run's progress with what a brand new run starts with."""
        fresh = self._build_run(user_id, *variant)
        built = sa_inspect(fresh).dict
        for column in self.run_model.__table__.columns:
            if column.key in _KEPT_ON_ABANDON or column.key == self.best_field:
                continue
            if column.key in built:
                setattr(run, column.key, built[column.key])
            elif column.default is not None and column.default.is_scalar:
                setattr(run, column.key, column.default.arg)
            else:
                raise RuntimeError(f"{self.run_model.__name__}.{column.key} is neither rebuilt nor given a plain default, so abandoning would keep its old value")

    def _is_untouched(self, run) -> bool:
        """True while nothing has been played or revealed in the run, so its frozen pool can still change."""
        return False

    def _pool_is_stale(self, run) -> bool:
        """True when the run's frozen pool no longer matches the user's live roster."""
        return False

    def _refresh_if_untouched(self, run, user_id: int, *variant: Any) -> None:
        """A run that has not started yet follows the live roster, so unlocking characters
        after it was created does not leave it stuck on the old pool."""
        if run.status != "in_progress" or not self._is_untouched(run) or not self._pool_is_stale(run):
            return
        with transaction():
            self._reset_to_fresh(run, user_id, *variant)


    # -- guards --------------------------------------------------------------

    @staticmethod
    def _validate_result(result: str) -> None:
        if result not in ("win", "loss"):
            raise ValueError("Result must be 'win' or 'loss'")

    def _validate_killer_submission(self, result: str, killer_id: str) -> None:
        self._validate_result(result)
        if not killer_id:
            raise ValueError("killer_id is required")

    def _load_run_for_result(self, user_id: int, run_id: int):
        run = self._find_run_by_id(user_id, run_id)
        if not run:
            raise ValueError("Run not found")
        if run.status == "completed":
            raise ValueError("This run is already completed. Abandon it to play again.")
        return run

    def _load_run_for_inactivity(self, run_id: int, idle_before: datetime | None = None):
        """The run an inactivity loss applies to, locked, or None when there is nothing to do: it is gone,
        completed, or was played after `idle_before` (the cleanup picked it from a list built earlier)."""
        model = self.run_model
        query = select(model).where(model.id == run_id)
        if idle_before is not None:
            query = query.where(model.updated_at < idle_before)
        run = db.session.scalars(lock_for_update(query)).first()
        if not run or run.status == "completed":
            end_transaction()
            return None
        return run

    # -- pools / completion ----------------------------------------------------

    @staticmethod
    def _freeze_if_empty(run, column: str, live_value: Callable[[], Any]) -> None:
        """Freeze a pool from the live roster only when the run has none stored yet."""
        if not getattr(run, column):
            setattr(run, column, live_value())

    def _complete_run(self, run, user_id: int, variant: str, owned_ids: list[int], **milestone_kwargs: Any) -> None:
        """Record the completion and reset the attempt counter.

        `owned_ids` must be captured before the caller refreezes the pool --
        doing it after would silently pull in a newly-owned character,
        inflating the count.
        """
        is_full, _ = get_full_roster_milestone(owned_ids, **milestone_kwargs)
        record_challenge_completion(
            user_id=user_id,
            mode=self.mode,
            variant=variant,
            attempts_taken=run.attempts + 1,
            matches_played=run.playthrough_matches,
            unlocked_characters_count=len(owned_ids),
            full_roster=is_full,
        )
        run.finish_playthrough()

    def _completions(self, user_id: int, variant: str):
        return fetch_challenge_completions(user_id, self.mode, variant)
