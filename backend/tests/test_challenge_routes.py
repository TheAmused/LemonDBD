import os
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService


class TestChallengeRoutes(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_challenge_routes.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.challenge_service = ChallengeService(db_service=self.db_service)

        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["CHALLENGE_SERVICE"] = self.challenge_service
        self.client = self.app.test_client()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_challenge_run_returns_200(self):
        response = self.client.get("/api/v1/challenges/run")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("run", data)
        self.assertIn("settings", data)
        self.assertEqual(data["run"]["role"], "survivor")

    def test_roll_challenge_returns_new_loadout(self):
        response = self.client.post("/api/v1/challenges/roll", json={"role": "survivor"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("run", data)
        self.assertIn("current_loadout", data["run"])
        self.assertIn("character", data["run"]["current_loadout"])

    def test_submit_result_win(self):
        run_res = self.client.get("/api/v1/challenges/run")
        self.assertEqual(run_res.status_code, 200)
        run_id = run_res.get_json()["run"]["id"]

        response = self.client.post("/api/v1/challenges/result", json={"run_id": run_id, "result": "win"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("run", data)

    def test_get_and_update_settings(self):
        get_res = self.client.get("/api/v1/challenges/settings")
        self.assertEqual(get_res.status_code, 200)

        post_res = self.client.post(
            "/api/v1/challenges/settings",
            json={"active_role": "killer", "checkpoint_interval": 5},
        )
        self.assertEqual(post_res.status_code, 200)
        settings = post_res.get_json()["settings"]
        self.assertEqual(settings["active_role"], "killer")
        self.assertEqual(settings["checkpoint_interval"], 5)

    def test_get_stats(self):
        response = self.client.get("/api/v1/challenges/stats")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("stats", data)
        self.assertIn("total_matches", data["stats"])


if __name__ == "__main__":
    unittest.main()
