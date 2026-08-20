# backend/tests/unit/test_history_models.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import HistoryRun, HistoryMatchLog, User


class TestHistoryModels(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _make_user(self):
        user = User(username="historyuser", email="history@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_history_run_round_trip(self):
        user = self._make_user()
        run = HistoryRun(
            user_id=user.id,
            mode="medium",
            status="in_progress",
            current_row_index=1,
            total_killers_beaten=6,
            best_killers_beaten=6,
            completed_killers_json=json.dumps(["The Wraith"]),
            unlocked_perk_names_json=json.dumps(["Hex: Ruin", "Save the Best for Last"]),
            checkpoint_row_index=1,
            checkpoint_total_killers_beaten=5,
            checkpoint_completed_killers_json="[]",
            checkpoint_unlocked_perk_names_json=json.dumps(["Hex: Ruin"]),
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["mode"], "medium")
        self.assertEqual(d["current_row_index"], 1)
        self.assertEqual(d["total_killers_beaten"], 6)
        self.assertEqual(d["completed_killers"], ["The Wraith"])
        self.assertEqual(d["unlocked_perk_names"], ["Hex: Ruin", "Save the Best for Last"])
        self.assertEqual(d["checkpoint_row_index"], 1)

    def test_unique_constraint_on_user_and_mode(self):
        user = self._make_user()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        db.session.commit()
        db.session.add(HistoryRun(user_id=user.id, mode="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_history_match_log_round_trip(self):
        user = self._make_user()
        run = HistoryRun(user_id=user.id, mode="hell")
        db.session.add(run)
        db.session.commit()

        log = HistoryMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            row_index=0,
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["result"], "win")
        self.assertEqual(d["row_index"], 0)
        self.assertEqual(d["streak_after"], 1)


if __name__ == "__main__":
    unittest.main()
