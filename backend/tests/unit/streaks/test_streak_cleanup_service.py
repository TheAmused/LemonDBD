# backend/tests/unit/streaks/test_streak_cleanup_service.py
from datetime import datetime, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import (
    ChaosMatchLog,
    ChaosRun,
    GauntletMatchLog,
    GauntletRun,
    HistoryMatchLog,
    HistoryRun,
    IdPleaseMatchLog,
    IdPleaseRun,
    PageStreakPageLog,
    PageStreakRun,
    utcnow,
)
from app.services.streak_cleanup_service import apply_inactivity_losses


@pytest.mark.unit
class TestStreakCleanupService:
    """Tests for automated background sweeping of stale runs across all challenge modes."""

    def _stale_gauntlet_run(
        self, db_session: Session, days_old: int, status: str = "in_progress"
    ) -> GauntletRun:
        run = GauntletRun(
            user_id=1,
            role="killer",
            status=status,
            current_character_id="Trapper",
            owned_character_ids=[],
        )
        db_session.add(run)
        db_session.commit()
        run.updated_at = utcnow() - timedelta(days=days_old)
        db_session.commit()
        return run

    def test_applies_a_loss_to_an_in_progress_run_past_the_threshold(
        self, db_session: Session
    ) -> None:
        run = self._stale_gauntlet_run(db_session, days_old=91)
        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected["gauntlet_runs"] == 1

        log = db_session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        assert log is not None
        assert log.triggered_by == "inactivity"
        assert db_session.query(GauntletRun).count() == 1

    def test_does_not_touch_a_recently_touched_run(self, db_session: Session) -> None:
        self._stale_gauntlet_run(db_session, days_old=10)
        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected["gauntlet_runs"] == 0
        assert db_session.query(GauntletMatchLog).count() == 0

    def test_does_not_touch_a_completed_run_past_the_threshold(
        self, db_session: Session
    ) -> None:
        self._stale_gauntlet_run(db_session, days_old=200, status="completed")
        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected["gauntlet_runs"] == 0
        assert db_session.query(GauntletMatchLog).count() == 0

    def test_applies_across_all_five_run_tables(self, db_session: Session) -> None:
        self._stale_gauntlet_run(db_session, days_old=91)

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db_session.add(chaos)
        db_session.commit()
        chaos.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        db_session.add(history)
        db_session.commit()
        history.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        id_please = IdPleaseRun(
            user_id=1,
            difficulty="hardcore",
            status="in_progress",
            current_streak=2,
            current_match=3,
            current_loadout={"number": 3, "side": "survivor", "character_id": 1, "perk_ids": [1, 2, 3, 4]},
        )
        db_session.add(id_please)
        db_session.commit()
        id_please.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        page = PageStreakRun(
            user_id=1,
            killer="Trapper",
            status="in_progress",
            attempt=1,
            current_page=1,
            best_page=0,
            pages=[],
        )
        db_session.add(page)
        db_session.commit()
        page.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected == {
            "gauntlet_runs": 1,
            "chaos_runs": 1,
            "history_runs": 1,
            "id_please_runs": 1,
            "page_streak_runs": 1,
        }
        assert (
            db_session.query(ChaosMatchLog).filter_by(triggered_by="inactivity").count() == 1
        )
        assert (
            db_session.query(HistoryMatchLog).filter_by(triggered_by="inactivity").count() == 1
        )
        assert (
            db_session.query(PageStreakPageLog).filter_by(triggered_by="inactivity").count() == 1
        )
        assert db_session.query(IdPleaseMatchLog).filter_by(triggered_by="inactivity", result="loss", streak_before=2, streak_after=0).count() == 1
        db_session.refresh(id_please)
        assert (id_please.current_match, id_please.current_streak) == (0, 0)

    def test_dedicated_lock_connection_plumbing_is_a_noop_on_sqlite(
        self, db_session: Session
    ) -> None:
        from app.core.extensions import db

        run = self._stale_gauntlet_run(db_session, days_old=91)
        assert db.engine.dialect.name == "sqlite"
        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected["gauntlet_runs"] == 1
        log = db_session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        assert log is not None
        assert log.triggered_by == "inactivity"

    def test_skips_a_run_that_was_played_after_the_stale_list_was_built(self, db_session: Session) -> None:
        from app.core.extensions import db
        from app.services.chaos_service import ChaosService

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db_session.add(chaos)
        db_session.commit()

        assert ChaosService().apply_inactivity_loss(chaos.id, utcnow() - timedelta(days=90)) is False
        # The row lock taken by the lookup is released, not held for the rest of the loop.
        assert not db.session().in_transaction()
        assert db_session.query(ChaosMatchLog).count() == 0

    def test_skips_a_gauntlet_run_that_was_completed_in_the_meantime(self, db_session: Session) -> None:
        from app.core.extensions import db
        from app.services.gauntlet_service import GauntletService

        run = self._stale_gauntlet_run(db_session, days_old=200, status="completed")

        assert GauntletService().apply_inactivity_loss(run.id, utcnow() - timedelta(days=90)) is False
        assert not db.session().in_transaction()
        assert db_session.query(GauntletMatchLog).count() == 0

    def test_a_run_left_idle_since_the_list_was_built_is_skipped_in_every_mode(self, db_session: Session) -> None:
        from app.core.extensions import db
        from app.services.chaos_service import ChaosService
        from app.services.history_service import HistoryService
        from app.services.page_streak.runs import apply_inactivity_loss as apply_page_streak_loss

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        page = PageStreakRun(user_id=1, killer="Trapper", status="in_progress", attempt=1, current_page=1, best_page=0, pages=[])
        db_session.add_all([chaos, history, page])
        db_session.commit()
        cutoff = utcnow() - timedelta(days=90)

        assert ChaosService().apply_inactivity_loss(chaos.id, cutoff) is False
        assert HistoryService().apply_inactivity_loss(history.id, cutoff) is False
        assert apply_page_streak_loss(page.id, cutoff) is False
        assert not db.session().in_transaction()
        assert db_session.query(ChaosMatchLog).count() == 0
        assert db_session.query(HistoryMatchLog).count() == 0
        assert db_session.query(PageStreakPageLog).count() == 0

    def test_a_stale_run_is_counted_by_each_mode_once_the_cutoff_passes_it(self, db_session: Session) -> None:
        from app.services.history_service import HistoryService

        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        db_session.add(history)
        db_session.commit()
        history.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        assert HistoryService().apply_inactivity_loss(history.id, utcnow() - timedelta(days=90)) is True
        assert db_session.query(HistoryMatchLog).filter_by(triggered_by="inactivity").count() == 1

    def test_one_failing_run_does_not_stop_the_rest_of_the_sweep(
        self, db_session: Session, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from app.core.extensions import db
        from app.services.gauntlet_service import GauntletService
        from app.services.streak_run import load_idle_run_locked

        run = self._stale_gauntlet_run(db_session, days_old=91)
        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db_session.add(chaos)
        db_session.commit()
        chaos.updated_at = utcnow() - timedelta(days=91)
        db_session.commit()

        def fail_after_locking(self: GauntletService, run_id: int, idle_before: datetime | None = None) -> bool:
            locked = load_idle_run_locked(GauntletRun, run_id, idle_before)
            assert locked is not None
            locked.status = "half-written"  # unsaved work the sweep must throw away
            raise RuntimeError("boom")

        monkeypatch.setattr(GauntletService, "apply_inactivity_loss", fail_after_locking)

        affected = apply_inactivity_losses(inactive_after_days=90)
        assert affected["gauntlet_runs"] == 0
        assert affected["chaos_runs"] == 1
        assert not db.session().in_transaction()
        db_session.expire_all()
        assert db_session.get(GauntletRun, run.id).status == "in_progress"

    def test_ending_a_transaction_refuses_to_discard_unsaved_work(self, db_session: Session) -> None:
        from app.core.transaction import end_transaction

        db_session.add(ChaosRun(user_id=1, difficulty="hell", status="in_progress"))
        with pytest.raises(RuntimeError, match="unsaved changes"):
            end_transaction()
        db_session.rollback()
        end_transaction()  # nothing pending now
