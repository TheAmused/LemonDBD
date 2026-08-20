# backend/tests/unit/test_chaos_stats.py
import json
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import ChaosMatchLog, ChaosRun, User
from app.services.chaos.stats import fetch_chaos_user_stats


class TestChaosStats(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        user = User(username="statsuser", email="stats@test.com", password_hash="x")
        db.session.add(user)
        db.session.commit()
        self.user_id = user.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_no_runs_yet(self):
        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(
            stats,
            {"total_matches": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "recent_logs": []},
        )

    def test_counts_wins_and_losses_for_the_given_difficulty_only(self):
        hell_run = ChaosRun(user_id=self.user_id, difficulty="hell")
        easy_run = ChaosRun(user_id=self.user_id, difficulty="easy")
        db.session.add_all([hell_run, easy_run])
        db.session.commit()

        db.session.add_all([
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Trapper", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
            ChaosMatchLog(
                run_id=hell_run.id, killer_id="The Wraith", result="loss",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=1, streak_after=0,
            ),
            ChaosMatchLog(
                run_id=easy_run.id, killer_id="The Hillbilly", result="win",
                perks_json="[]", addon_rarities_json="[]",
                streak_before=0, streak_after=1,
            ),
        ])
        db.session.commit()

        stats = fetch_chaos_user_stats(self.user_id, "hell")
        self.assertEqual(stats["total_matches"], 2)
        self.assertEqual(stats["wins"], 1)
        self.assertEqual(stats["losses"], 1)
        self.assertEqual(stats["win_rate"], 50.0)
        self.assertEqual(len(stats["recent_logs"]), 2)


if __name__ == "__main__":
    unittest.main()
