import os
import unittest
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService

class TestChallengeService(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_challenge_engine.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = ChallengeService(db_service=self.db_service)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_win_increments_streak_and_applies_checkpoint(self):
        run = self.service.get_or_create_run("survivor")
        self.assertEqual(run["current_streak"], 0)

        # Simulate 3 wins (checkpoint interval = 3)
        res1 = self.service.submit_result(run_id=run["id"], result="win")
        self.assertEqual(res1["current_streak"], 1)

        res2 = self.service.submit_result(run_id=run["id"], result="win")
        self.assertEqual(res2["current_streak"], 2)

        res3 = self.service.submit_result(run_id=run["id"], result="win")
        self.assertEqual(res3["current_streak"], 3)
        self.assertEqual(res3["last_checkpoint_streak"], 3)

        # Simulate 1 loss -> Should roll back to checkpoint (streak = 3)
        res4 = self.service.submit_result(run_id=run["id"], result="loss")
        self.assertEqual(res4["current_streak"], 3)

    def test_roll_challenge_selects_uncompleted_character(self):
        run = self.service.get_or_create_run("survivor")
        # Mark initial character as completed
        initial_char = run["current_character_id"]
        
        # Roll next challenge
        new_run = self.service.roll_challenge("survivor")
        
        # If there are multiple characters, new character should be selected or uncompleted
        # Let's set completed_characters explicitly in run to test filtering
        conn = self.db_service.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE challenge_runs SET completed_characters_json = ? WHERE id = ?;",
            ('["Meg Thomas"]', run["id"])
        )
        conn.commit()
        conn.close()

        rolled = self.service.roll_challenge("survivor")
        self.assertNotIn(rolled["current_character_id"], ["Meg Thomas"])
        self.assertIn("current_loadout", rolled)
        self.assertIn("perks", rolled["current_loadout"])

if __name__ == "__main__":
    unittest.main()
