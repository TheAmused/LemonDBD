# backend/tests/api/test_page_streak_routes.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.services.page_streak_service import PageStreakService
from app.services.user_service import UserService
from tests.test_page_streak_service import FakePerkService, make_perks, seed_perks


class TestPageStreakRoutes(unittest.TestCase):
    def setUp(self):
        # TestingConfig keeps this on an in-memory SQLite DB. Without it the tests
        # bind to the real DATABASE_URL and tearDown's drop_all() wipes the dev database.
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.perks = make_perks(32, character="Nurse")
        seed_perks(self.perks)
        self.app.config["PAGE_STREAK_SERVICE"] = PageStreakService(
            perk_service=FakePerkService(self.perks),
        )

        user_service = UserService()
        user, err = user_service.register_user("streakuser", "streak@test.com", "password123")
        assert err is None
        self.user_id = user.id
        self.token = user_service.generate_token(user.id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        self.assertEqual(self.client.get("/api/v1/page-streak/roster").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/page-streak/run?killer=Nurse").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}).status_code, 401
        )

    def test_roster_endpoint(self):
        res = self.client.get("/api/v1/page-streak/roster", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["killer"], "Nurse")
        self.assertEqual(body["data"][0]["status"], "not_started")

    def test_run_lifecycle(self):
        res = self.client.get("/api/v1/page-streak/run?killer=Nurse", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        run = res.get_json()["run"]
        self.assertEqual(run["current_page"], 1)

        build = run["pages"][0][:4]
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 1, "perks": build, "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 2)

        res = self.client.post("/api/v1/page-streak/run/reset", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_page"], 1)

    def test_result_validation_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        res = self.client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 2, "perks": ["Perk 001"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_start_requires_killer(self):
        res = self.client.post("/api/v1/page-streak/run/start", json={}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_run_requires_killer_query_param(self):
        res = self.client.get("/api/v1/page-streak/run", headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_start_twice_returns_400(self):
        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        res = self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_runs_are_isolated_per_user(self):
        user_service = UserService()
        other, err = user_service.register_user("otherstreakuser", "other@test.com", "password123")
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        self.client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=self.headers)

        res = self.client.get("/api/v1/page-streak/run?killer=Nurse", headers=other_headers)
        self.assertIsNone(res.get_json()["run"])

        res = self.client.get("/api/v1/page-streak/roster", headers=other_headers)
        self.assertEqual(res.get_json()["data"][0]["status"], "not_started")


if __name__ == "__main__":
    unittest.main()
