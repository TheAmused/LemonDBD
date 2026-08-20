# backend/tests/unit/test_chaos_models.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosRun, ChaosMatchLog, User


class TestChaosModels(unittest.TestCase):
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
        user = User(username="chaosuser", email="chaos@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        return user

    def test_chaos_run_round_trip(self):
        user = self._make_user()
        run = ChaosRun(
            user_id=user.id,
            difficulty="hell",
            status="in_progress",
            current_streak=0,
            best_streak=0,
            last_checkpoint_streak=0,
            completed_killers_json="[]",
            checkpoint_killers_json="[]",
            used_perks_json=json.dumps(["Hex: Ruin"]),
            checkpoint_used_perks_json="[]",
            current_perks_json=json.dumps([{"name": "Hex: Ruin"}]),
            current_addon_rarities_json=json.dumps(["Rare", "Rare"]),
            perks_revealed=False,
        )
        db.session.add(run)
        db.session.commit()

        d = run.to_dict()
        self.assertEqual(d["difficulty"], "hell")
        self.assertEqual(d["used_perks"], ["Hex: Ruin"])
        self.assertEqual(d["current_perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["current_addon_rarities"], ["Rare", "Rare"])
        self.assertFalse(d["perks_revealed"])

    def test_unique_constraint_on_user_and_difficulty(self):
        user = self._make_user()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell"))
        db.session.commit()
        db.session.add(ChaosRun(user_id=user.id, difficulty="hell"))
        with self.assertRaises(Exception):
            db.session.commit()
        db.session.rollback()

    def test_chaos_match_log_round_trip(self):
        user = self._make_user()
        run = ChaosRun(user_id=user.id, difficulty="easy")
        db.session.add(run)
        db.session.commit()

        log = ChaosMatchLog(
            run_id=run.id,
            killer_id="The Trapper",
            result="win",
            perks_json=json.dumps([{"name": "Hex: Ruin"}]),
            addon_rarities_json=json.dumps(["Common", "Rare"]),
            streak_before=0,
            streak_after=1,
        )
        db.session.add(log)
        db.session.commit()

        d = log.to_dict()
        self.assertEqual(d["killer_id"], "The Trapper")
        self.assertEqual(d["perks"], [{"name": "Hex: Ruin"}])
        self.assertEqual(d["addon_rarities"], ["Common", "Rare"])


if __name__ == "__main__":
    unittest.main()
