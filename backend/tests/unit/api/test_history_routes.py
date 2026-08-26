# backend/tests/api/test_history_routes.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, release_number, perk_count=2):
    character = Character(name=name, role="Killer", release_number=release_number)
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class TestHistoryRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper", release_number=1)
        seed_killer("The Wraith", release_number=2)
        user, err = self.user_service.register_user("routeuser", "route@test.com", "password123")
        self.assertIsNone(err)
        self.user_id = user.id
        self.token = self.user_service.authenticate("routeuser", "password123")[1]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["mode"], "hell")
        self.assertEqual(run["current_row_killers"], ["The Trapper", "The Wraith"])

    def test_run_requires_valid_mode(self):
        resp = self.client.get("/api/v1/history-streak/run?mode=easy", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()["run"]
        self.assertIn("The Trapper", body["completed_killers"])
        self.assertGreater(len(body["newly_unlocked_perks"]), 0)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/history-streak/run?mode=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/history-streak/run/reset", json={"mode": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["total_killers_beaten"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/history-streak/stats?mode=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)


if __name__ == "__main__":
    unittest.main()
