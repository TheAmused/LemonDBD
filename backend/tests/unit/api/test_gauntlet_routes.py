# backend/tests/unit/api/test_gauntlet_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name: str, perk_count: int = 3) -> Character:
    from app.core.extensions import db

    character = Character(name=name, role="Killer")
    db.session.add(character)
    db.session.flush()
    for i in range(1, perk_count + 1):
        db.session.add(
            Perk(
                name=f"{name} Perk {i}",
                character_id=character.id,
                is_teachable=True,
                category="Killer",
            )
        )
    db.session.commit()
    return character


@pytest.fixture
def gauntlet_auth_setup(db_session: Session) -> tuple[int, str, dict[str, str]]:
    seed_killer("Nurse")
    seed_killer("Trapper")

    user_service = UserService()
    user, err = user_service.register_user("streakuser", "gauntlet@test.com", "password123")
    assert err is None
    token = user_service.generate_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user.id, token, headers


@pytest.mark.unit
class TestGauntletRoutes:
    """Tests for Gauntlet Streak challenge routes: progress, target reveals, checkpoints, and restarts."""

    def test_endpoints_require_login(self, client: FlaskClient) -> None:
        assert client.get("/api/v1/gauntlet-streak/run?role=killer").status_code == 401
        assert client.post("/api/v1/gauntlet-streak/run/reset", json={"role": "killer"}).status_code == 401
        assert client.get("/api/v1/gauntlet-streak/stats?role=killer").status_code == 401

    def test_run_requires_valid_role(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        res = client.get("/api/v1/gauntlet-streak/run?role=bogus", headers=headers)
        assert res.status_code == 400

    def test_get_run_auto_creates(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert res.status_code == 200
        run = res.get_json()["run"]
        assert run["role"] == "killer"
        assert run["status"] == "in_progress"
        assert "tier_info" in run

    def test_result_lifecycle(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run_id = run_res.get_json()["run"]["id"]

        res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["previous_run"]["current_streak"] == 1
        assert "run" in data

    def test_reveal_endpoint(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run_id = run_res.get_json()["run"]["id"]

        res = client.post(
            "/api/v1/gauntlet-streak/reveal",
            json={"run_id": run_id},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.get_json()["run"]["target_revealed"] is True

    def test_run_carries_the_targets_character_perks(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run = run_res.get_json()["run"]

        perks = run["current_loadout"]["character_perks"]
        assert perks
        assert all(p["character"] == run["current_character_id"] for p in perks)

    def test_reset_endpoint(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        res = client.post(
            "/api/v1/gauntlet-streak/run/reset",
            json={"role": "killer"},
            headers=headers,
        )
        assert res.status_code == 200
        run = res.get_json()["run"]
        assert run["current_streak"] == 0
        assert run["target_revealed"] is False

    def test_stats_endpoint(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        res = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers)
        assert res.status_code == 200
        assert "stats" in res.get_json()

    def test_runs_are_isolated_per_user(
        self, client: FlaskClient, gauntlet_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = gauntlet_auth_setup
        user_service = UserService()
        other, err = user_service.register_user(
            "otherstreakuser", "other-gauntlet@test.com", "password123"
        )
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        run_id = run_res.get_json()["run"]["id"]
        client.post(
            "/api/v1/gauntlet-streak/result",
            json={"role": "killer", "run_id": run_id, "result": "win"},
            headers=headers,
        )

        other_run = client.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=other_headers
        ).get_json()["run"]
        assert other_run["current_streak"] == 0
