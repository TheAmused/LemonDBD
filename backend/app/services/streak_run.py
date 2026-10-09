# backend/app/services/streak_run.py
"""Run lifecycle shared by the chaos, gauntlet and history services.

The three modes keep their own run models, win/loss rules and response
payloads. What they repeated verbatim lives here: looking a run up, the
find-or-create flow, reset, the guards in front of `submit_result`, the
inactivity-loss lookup, lazy pool freezing and the completion record.
"""
from collections.abc import Callable
from typing import Any

from sqlalchemy import inspect as sa_inspect, select

from app.core.extensions import db
from app.services.admin_control_service import assert_challenge_mode_enabled
from app.services.challenge_completions import fetch_challenge_completions, record_challenge_completion
from app.services.roster_milestone import get_full_roster_milestone


#: Run columns that outlive an abandoned run: its identity, its attempt bookkeeping and its lifetime totals.
_KEPT_ON_ABANDON = frozenset({"id", "user_id", "created_at", "updated_at", "attempt", "attempts", "total_wins", "total_losses"})


class StreakRunService:
    #: Challenge mode name ("chaos", "gauntlet", "history").
    mode: str
    run_model: type
    #: Run column holding the best streak, which survives a reset.
    best_field: str = "best_streak"
    #: Run columns that, with `user_id`, identify one run; the order is the
    #: order of the variant arguments of `get_or_create_run` / `reset_run`.
    variant_fields: tuple[str, ...]

    # -- lookup -----------------------------------------------------------

    def _find_run(self, user_id: int, *variant: Any):
        model = self.run_model
        conditions = [model.user_id == user_id]
        conditions += [getattr(model, field) == value for field, value in zip(self.variant_fields, variant)]
        return db.session.scalars(select(model).where(*conditions)).first()

    def _find_run_by_id(self, user_id: int, run_id: int):
        model = self.run_model
        return db.session.scalars(
            select(model).where(model.id == run_id, model.user_id == user_id)
        ).first()

    # -- find-or-create / reset ---------------------------------------------

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

        run = self._build_run(user_id, *variant)
        db.session.add(run)
        db.session.commit()
        return self._present(run)

    def _reset_run(self, user_id: int, *variant: Any):
        """Abandon the run in play: back to zero in a new attempt, with every match played so far kept.

        The run row stays, so its match logs do. Its progress is overwritten with what a
        brand new run starts with; the best streak is a record, so it is left alone.
        """
        assert_challenge_mode_enabled(self.mode)
        run = self._find_run(user_id, *variant)
        if not run:
            raise ValueError("Run not found")
        run.abandon_attempt()

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
        db.session.commit()
        return self._present(run)

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
            raise ValueError("This run is already completed. Reset it to play again.")
        return run

    def _load_run_for_inactivity(self, run_id: int):
        """The run an inactivity loss applies to, or None when there is nothing to do."""
        run = db.session.scalars(select(self.run_model).where(self.run_model.id == run_id)).first()
        if not run or run.status == "completed":
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
