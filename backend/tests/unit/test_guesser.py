# backend/tests/unit/test_guesser.py
import gc
import json
import tempfile
import unittest
from pathlib import Path
import pytest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.others.guesser_service import GuesserService


@pytest.mark.unit
class TestGuesserModule(unittest.TestCase):
    def setUp(self):
        self._temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._temp_dir.name) / "test_guesser.db")
            
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        
        self.app = create_app()
        self.app.config["TESTING"] = True
        from app.routes.others.guesser import guesser_service
        self.original_db = guesser_service.db_service
        self.original_use_sa = guesser_service._use_sqlalchemy
        guesser_service.db_service = self.db_service
        guesser_service._use_sqlalchemy = False
        
        self.client = self.app.test_client()
        self.service = GuesserService(db_service=self.db_service)

    def tearDown(self):
        from app.routes.others.guesser import guesser_service
        guesser_service.db_service = self.original_db
        guesser_service._use_sqlalchemy = self.original_use_sa
        gc.collect()
        try:
            self._temp_dir.cleanup()
        except Exception:
            pass

    def test_database_initialization(self):
        stats = self.service.get_all_stats()
        self.assertIn("character", stats)
        self.assertIn("perk_description", stats)
        self.assertIn("perk_name_to_icon", stats)
        self.assertIn("perk_icon_to_name", stats)
        
        self.assertEqual(stats["character"]["current_streak"], 0)
        self.assertEqual(stats["character"]["best_streak"], 0)
        self.assertEqual(stats["character"]["total_guesses"], 0)
        self.assertEqual(stats["character"]["correct_guesses"], 0)

    def test_update_stats_correct_guess(self):
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 1)
        self.assertEqual(updated["best_streak"], 1)
        self.assertEqual(updated["total_guesses"], 1)
        self.assertEqual(updated["correct_guesses"], 1)
        
        updated = self.service.update_stats("character", is_correct=True)
        self.assertEqual(updated["current_streak"], 2)
        self.assertEqual(updated["best_streak"], 2)
        
        stats = self.service.get_all_stats()
        self.assertEqual(stats["character"]["current_streak"], 2)
        self.assertEqual(stats["character"]["best_streak"], 2)

    def test_update_stats_incorrect_guess_breaks_streak(self):
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        updated = self.service.update_stats("character", is_correct=False)
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 2)
        self.assertEqual(updated["total_guesses"], 3)
        self.assertEqual(updated["correct_guesses"], 2)

    def test_reset_streak(self):
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        self.service.update_stats("character", is_correct=True)
        
        updated = self.service.reset_streak("character")
        self.assertEqual(updated["current_streak"], 0)
        self.assertEqual(updated["best_streak"], 3)

    def test_api_routes(self):
        response = self.client.get("/api/v1/guesser/stats")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertIsInstance(data["data"], dict)

        response = self.client.post("/api/v1/guesser/stats", json={
            "guesser_type": "character",
            "is_correct": True
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 1)

        response = self.client.get("/api/v1/guesser/stats")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertIn("character", data["data"])

        response = self.client.post("/api/v1/guesser/reset", json={
            "guesser_type": "character"
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode("utf-8"))
        self.assertEqual(data["data"]["current_streak"], 0)


if __name__ == "__main__":
    unittest.main()
