import os
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.challenge_service import ChallengeService


class TestGauntletRoutes(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_gauntlet_routes.db"
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

    def test_invalidate_match_endpoint(self):
        run_res = self.client.get('/api/v1/challenges/run?role=survivor')
        self.assertEqual(run_res.status_code, 200)
        run_data = run_res.get_json()
        self.assertIn("tier_info", run_data)
        run_id = run_data["run"]["id"]

        response = self.client.post('/api/v1/challenges/invalidate', json={"run_id": run_id, "reason": "dc_before_5_gens"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("run", data)
        self.assertEqual(data["run"]["id"], run_id)

    def test_character_pool_endpoints(self):
        get_res = self.client.get('/api/v1/challenges/pool?role=survivor')
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.get_json()
        self.assertIn("disabled_characters", get_data)

        post_res = self.client.post('/api/v1/challenges/pool', json={"role": "survivor", "disabled_characters": ["Dwight Fairfield"]})
        self.assertEqual(post_res.status_code, 200)
        post_data = post_res.get_json()
        self.assertIn("disabled_characters", post_data)
        self.assertIn("Dwight Fairfield", post_data["disabled_characters"])

        verify_res = self.client.get('/api/v1/challenges/pool?role=survivor')
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.get_json()
        self.assertIn("Dwight Fairfield", verify_data["disabled_characters"])


if __name__ == "__main__":
    unittest.main()
