# backend/tests/unit/test_streak_cleanup_service.py
from datetime import timedelta
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
            owned_characters_json="[]",
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

    def test_applies_across_all_four_run_tables(self, db_session: Session) -> None:
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

        page = PageStreakRun(
            user_id=1,
            killer="Trapper",
            status="in_progress",
            attempt=1,
            current_page=1,
            best_page=0,
            pages_json="[]",
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
