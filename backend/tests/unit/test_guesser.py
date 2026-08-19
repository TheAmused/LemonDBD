# backend/tests/unit/test_guesser.py
import os
import json
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.guesser_service import GuesserService

class TestGuesserModule(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_guesser.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        # Initialize database
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        
        # Initialize flask app
        self.app = create_app()
        self.app.config["TESTING"] = True
        # Monkey patch DatabaseService path within routes
        from app.routes.others.guesser import guesser_service
        self.original_db = guesser_service.db_service
        guesser_service.db_service = self.db_service
        
        self.client = self.app.test_client()
        self.service = GuesserService(db_service=self.db_service)

    def tearDown(self):
        from app.routes.others.guesser import guesser_service
        guesser_service.db_service = self.original_db
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_database_initialization(self):
        stats = self.service.get_all_stats()
        self.assertIn("character", stats)
        self.assertIn("perk_description", stats)
        self.assertIn("perk_name_to_icon", stats)
        self.assertIn("perk_icon_to_name", stats)
        
        # Ensure default counts are zero
        self.assertEqual(stats["character"]["current_streak"], 0)
        self.assertEqual(stats["character"]["best_streak"], 0)
        self.assertEqual(stats["character"]["total_guesses"], 0)
        self.assertEqual(stats["character"]["correct_guesses"], 0)

    def test_update_stats_correct_guess(self):
        # First correct guess
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 1)
        self.assertEqual(updated["best_streak"], 1)
        self.assertEqual(updated["total_guesses"], 1)
        self.assertEqual(updated["correct_guesses"], 1)
        
        # Second correct guess
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 2)
        self.assertEqual(updated["best_streak"], 2)
        
        # Verify persistence
        stats = self.service.get_all_stats()
        self.assertEqual(stats["character"]["current_streak"], 2)
        self.assertEqual(stats["character"]["best_streak"], 2)

    def test_update_stats_incorrect_guess_breaks_streak(self):
        # 2 correct guesses
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        # 1 incorrect guess
        updated = self.service.update_stats("character", is_correct=False)
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 2) # Best streak preserved
        self.assertEqual(updated["total_guesses"], 3)
        self.assertEqual(updated["correct_guesses"], 2)

    def test_reset_streak(self):
        # 3 correct guesses
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        # Reset
        updated = self.service.reset_streak("character")
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 3) # Best streak remains

    def test_api_routes(self):
        # Test GET /api/v1/guesser/stats
        response = self.client.get("/api/v1/guesser/stats")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertIn("character", data["data"])

        # Test POST /api/v1/guesser/stats
        response = self.client.post("/api/v1/guesser/stats", json={
            "guesser_type": "character",
            "is_correct": True
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 1)

        # Test POST /api/v1/guesser/reset
        response = self.client.post("/api/v1/guesser/reset", json={
            "guesser_type": "character"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 0)

if __name__ == "__main__":
    unittest.main()
