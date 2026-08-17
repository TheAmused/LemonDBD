import unittest
from app import create_app
from app.extensions import db
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name, perk_count=3):
    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(Perk(
            name=f"{name} Perk {i}",
            character_id=character.id,
            is_teachable=True,
            category="Killer",
        ))
    db.session.commit()
    return character


class TestGauntletRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        seed_killer("Nurse")
        seed_killer("Trapper")

        user_service = UserService()
        user, err = user_service.register_user("streakuser", "gauntlet@test.com", "password123")
        assert err is None
        self.user_id = user.id
        self.token = user_service.generate_token(user.id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_endpoints_require_login(self):
        self.assertEqual(self.client.get("/api/v1/gauntlet-streak/run?role=killer").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/gauntlet-streak/roll", json={"role": "killer"}).status_code, 401
        )
        self.assertEqual(self.client.get("/api/v1/gauntlet-streak/stats?role=killer").status_code, 401)

    def test_run_requires_valid_role(self):
        res = self.client.get("/api/v1/gauntlet-streak/run?role=bogus", headers=self.headers)
        self.assertEqual(res.status_code, 400)

    def test_get_run_auto_creates(self):
        res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        run = res.get_json()["run"]
        self.assertEqual(run["role"], "killer")
        self.assertEqual(run["status"], "in_progress")
        self.assertIn("tier_info", run)

    def test_roll_returns_a_loadout(self):
        res = self.client.post("/api/v1/gauntlet-streak/roll", json={"role": "killer"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        run = res.get_json()["run"]
        self.assertIn("current_loadout", run)
        self.assertIn("character", run["current_loadout"])

    def test_result_lifecycle(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]

        res = self.client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["previous_run"]["current_streak"], 1)
        self.assertIn("run", data)  # the freshly-rolled next run

    def test_invalidate_endpoint(self):
        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]
        target = run_res.get_json()["run"]["current_character_id"]

        res = self.client.post(
            "/api/v1/gauntlet-streak/invalidate",
            json={"run_id": run_id, "reason": "game_cancelled"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["run"]["current_character_id"], target)

    def test_stats_endpoint(self):
        res = self.client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("stats", res.get_json())

    def test_runs_are_isolated_per_user(self):
        user_service = UserService()
        other, err = user_service.register_user("otherstreakuser", "other-gauntlet@test.com", "password123")
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        run_res = self.client.get("/api/v1/gauntlet-streak/run?role=killer", headers=self.headers)
        run_id = run_res.get_json()["run"]["id"]
        self.client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=self.headers,
        )

        other_run = self.client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=other_headers
        ).get_json()["run"]
        self.assertEqual(other_run["current_streak"], 0)


if __name__ == "__main__":
    unittest.main()
