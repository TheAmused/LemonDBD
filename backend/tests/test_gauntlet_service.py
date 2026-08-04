import os
import unittest
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService

class TestGauntletService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_gauntlet.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = ChallengeService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_tier_perk_limits(self):
        # Tier 0 (Streak 0): 4 perks
        tier0 = self.service.get_tier_info(0)
        self.assertEqual(tier0["perk_limit"], 4)
        self.assertEqual(tier0["name"], "The Warm Up")

        # Tier 1 (Streak 3): 3 perks
        tier1 = self.service.get_tier_info(3)
        self.assertEqual(tier1["perk_limit"], 3)
        self.assertEqual(tier1["name"], "The Thinning")

        # Tier 2 (Streak 6): 2 perks
        tier2 = self.service.get_tier_info(6)
        self.assertEqual(tier2["perk_limit"], 2)
        self.assertEqual(tier2["name"], "The Struggle")

        # Tier 3 (Streak 9): 1 perk
        tier3 = self.service.get_tier_info(9)
        self.assertEqual(tier3["perk_limit"], 1)
        self.assertEqual(tier3["name"], "The Hardcore")

        # Tier 4 (Streak 12): 0 perks
        tier4 = self.service.get_tier_info(12)
        self.assertEqual(tier4["perk_limit"], 0)
        self.assertEqual(tier4["name"], "The Legend")

    def test_invalidate_match(self):
        run = self.service.get_or_create_run("survivor")
        char_id = run["current_character_id"]
        run_id = run["id"]
        streak_before = run["current_streak"]

        updated_run = self.service.invalidate_match(run_id, "dc_before_5_gens")
        self.assertEqual(updated_run["current_character_id"], char_id)
        self.assertEqual(updated_run["current_streak"], streak_before)

        # Check that exception was recorded in DB
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM match_exceptions WHERE run_id = ?;", (run_id,))
        exceptions = cursor.fetchall()
        conn.close()
        self.assertEqual(len(exceptions), 1)
        self.assertEqual(exceptions[0]["reason"], "dc_before_5_gens")

    def test_pool_settings(self):
        # Update settings to disable Dwight Fairfield
        self.service.update_pool_settings("survivor", ["Dwight Fairfield"])
        settings = self.service.get_pool_settings("survivor")
        self.assertIn("Dwight Fairfield", settings.get("disabled_names", []))

if __name__ == "__main__":
    unittest.main()
