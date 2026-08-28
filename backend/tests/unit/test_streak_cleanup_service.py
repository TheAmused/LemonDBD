# backend/tests/unit/test_streak_cleanup_service.py
import unittest
from datetime import timedelta
import pytest
from sqlalchemy import select

from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import (
    ChaosMatchLog, ChaosRun, GauntletMatchLog, GauntletRun,
    HistoryMatchLog, HistoryRun, PageStreakPageLog, PageStreakRun, utcnow,
)
from app.services.streak_cleanup_service import apply_inactivity_losses


@pytest.mark.unit
class StreakCleanupTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _stale_gauntlet_run(self, days_old, status="in_progress"):
        run = GauntletRun(
            user_id=1,
            role="killer",
            status=status,
            current_character_id="Trapper",
            owned_characters_json="[]",
        )
        db.session.add(run)
        db.session.commit()
        run.updated_at = utcnow() - timedelta(days=days_old)
        db.session.commit()
        return run

    def test_applies_a_loss_to_an_in_progress_run_past_the_threshold(self):
        run = self._stale_gauntlet_run(days_old=91)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 1)
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")
        self.assertEqual(db.session.query(GauntletRun).count(), 1)

    def test_does_not_touch_a_recently_touched_run(self):
        self._stale_gauntlet_run(days_old=10)
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_does_not_touch_a_completed_run_past_the_threshold(self):
        self._stale_gauntlet_run(days_old=200, status="completed")
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 0)
        self.assertEqual(db.session.query(GauntletMatchLog).count(), 0)

    def test_applies_across_all_four_run_tables(self):
        self._stale_gauntlet_run(days_old=91)

        chaos = ChaosRun(user_id=1, difficulty="hell", status="in_progress")
        db.session.add(chaos)
        db.session.commit()
        chaos.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        history = HistoryRun(user_id=1, mode="hell", status="in_progress")
        db.session.add(history)
        db.session.commit()
        history.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        page = PageStreakRun(
            user_id=1, killer="Trapper", status="in_progress",
            attempt=1, current_page=1, best_page=0, pages_json="[]",
        )
        db.session.add(page)
        db.session.commit()
        page.updated_at = utcnow() - timedelta(days=91)
        db.session.commit()

        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected, {
            "gauntlet_runs": 1,
            "chaos_runs": 1,
            "history_runs": 1,
            "page_streak_runs": 1,
        })
        self.assertEqual(db.session.query(ChaosMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(HistoryMatchLog).filter_by(triggered_by="inactivity").count(), 1)
        self.assertEqual(db.session.query(PageStreakPageLog).filter_by(triggered_by="inactivity").count(), 1)

    def test_dedicated_lock_connection_plumbing_is_a_noop_on_sqlite(self):
        run = self._stale_gauntlet_run(days_old=91)
        self.assertEqual(db.engine.dialect.name, "sqlite")
        affected = apply_inactivity_losses(inactive_after_days=90)
        self.assertEqual(affected["gauntlet_runs"], 1)
        log = db.session.scalars(
            select(GauntletMatchLog).where(GauntletMatchLog.run_id == run.id)
        ).first()
        self.assertEqual(log.triggered_by, "inactivity")


if __name__ == "__main__":
    unittest.main()
