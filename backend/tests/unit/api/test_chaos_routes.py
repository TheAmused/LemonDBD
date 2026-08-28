# backend/tests/unit/api/test_chaos_routes.py
# backend/tests/api/test_chaos_routes.py
import unittest
from app import create_app
from app.core.config import TestingConfig
from app.core.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}", character_id=character.id,
            is_teachable=True, category="Killer",
        ))
    db.session.commit()
    return character


class TestChaosRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.user_service = UserService()
        seed_killer("The Trapper")
        seed_killer("The Wraith")
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
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell")
        self.assertEqual(resp.status_code, 401)

    def test_get_run_auto_creates(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        run = resp.get_json()["run"]
        self.assertEqual(run["difficulty"], "hell")
        self.assertEqual(len(run["current_perks"]), 4)
        self.assertEqual(run["checkpoint_interval"], 0)

    def test_run_requires_valid_difficulty(self):
        resp = self.client.get("/api/v1/chaos-streak/run?difficulty=nonsense", headers=self.headers)
        self.assertEqual(resp.status_code, 400)

    def test_reveal_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run["id"]}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()["run"]["perks_revealed"])

    def test_result_lifecycle(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertIn("The Trapper", body["run"]["completed_killers"])
        self.assertEqual(body["run"]["current_streak"], 1)

    def test_result_requires_killer_id(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        resp = self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 400)

    def test_reset_endpoint(self):
        run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        self.client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=self.headers,
        )
        resp = self.client.post(
            "/api/v1/chaos-streak/run/reset", json={"difficulty": "hell"}, headers=self.headers
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["run"]["current_streak"], 0)

    def test_stats_endpoint(self):
        resp = self.client.get("/api/v1/chaos-streak/stats?difficulty=hell", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["stats"]["total_matches"], 0)

    def test_runs_are_isolated_per_difficulty(self):
        hell_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=self.headers
        ).get_json()["run"]
        easy_run = self.client.get(
            "/api/v1/chaos-streak/run?difficulty=easy", headers=self.headers
        ).get_json()["run"]
        self.assertNotEqual(hell_run["id"], easy_run["id"])


if __name__ == "__main__":
    unittest.main()
