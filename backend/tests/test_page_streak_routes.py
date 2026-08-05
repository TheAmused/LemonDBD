import os
import unittest
from app import create_app
from app.services.db_service import DatabaseService
from app.services.page_streak_service import PageStreakService
from tests.test_page_streak_service import FakePerkService, make_perks


class TestPageStreakRoutes(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_page_streak_routes.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db_service = DatabaseService(db_path=self.db_path)
        self.db_service.init_db()
        self.service = PageStreakService(
            db_service=self.db_service,
            perk_service=FakePerkService(make_perks(32, character="Nurse")),
        )
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["PAGE_STREAK_SERVICE"] = self.service
        self.client = self.app.test_client()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_roster_endpoint(self):
        res = self.client.get("/api/v1/page-streak/roster")
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["killer"], "Nurse")
        self.assertEqual(body["data"][0]["status"], "not_started")

    def test_excluded_perks_round_trip(self):
        res = self.client.put("/api/v1/page-streak/excluded-perks", json={"excluded": ["Perk 001"]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["pool_size"], 31)

        res = self.client.get("/api/v1/page-streak/excluded-perks")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["excluded"], ["Perk 001"])

    def test_run_lifecycle(self):
        res = self.client.get("/api/v1/page-streak/run?killer=Nurse")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 201)
        run = res.get_json()["run"]
        self.assertEqual(run["current_page"], 1)

        build = run["pages"][0][:4]
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 1, "perks": build, "result": "win"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 2)

        res = self.client.post("/api/v1/page-streak/run/reset", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 1)

    def test_result_validation_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 2, "perks": ["Perk 001"], "result": "win"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_start_requires_killer(self):
        res = self.client.post("/api/v1/page-streak/run/start", json={})
        self.assertEqual(res.status_code, 400)

    def test_run_requires_killer_query_param(self):
        res = self.client.get("/api/v1/page-streak/run")
        self.assertEqual(res.status_code, 400)

    def test_start_twice_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
