# backend/tests/unit/api/test_chaos_routes.py
import pytest
from flask import Flask
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
def auth_setup(db_session: Session) -> tuple[int, str, dict[str, str]]:
    seed_killer("The Trapper")
    seed_killer("The Wraith")

    user_service = UserService()
    user, err = user_service.register_user("routeuser", "route@test.com", "password123")
    assert err is None
    token = user_service.authenticate("routeuser", "password123")[1]
    headers = {"Authorization": f"Bearer {token}"}
    return user.id, token, headers


@pytest.mark.unit
class TestChaosRoutes:
    """Tests for Chaos Streak HTTP endpoints: life cycles, reveals, match submissions, and resets."""

    def test_endpoints_require_login(self, client: FlaskClient) -> None:
        resp = client.get("/api/v1/chaos-streak/run?difficulty=hell")
        assert resp.status_code == 401

        resp_rev = client.post("/api/v1/chaos-streak/reveal", json={"run_id": 1})
        assert resp_rev.status_code == 401

        resp_res = client.post("/api/v1/chaos-streak/result", json={"run_id": 1, "result": "win"})
        assert resp_res.status_code == 401

    def test_get_run_auto_creates(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        resp = client.get("/api/v1/chaos-streak/run?difficulty=hell", headers=headers)
        assert resp.status_code == 200
        run = resp.get_json()["run"]
        assert run["difficulty"] == "hell"
        assert len(run["current_perks"]) == 4
        assert run["checkpoint_interval"] == 0

    @pytest.mark.parametrize("invalid_diff", ["nonsense", "hardcore", "extreme", ""])
    def test_run_requires_valid_difficulty(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]], invalid_diff: str
    ) -> None:
        _, _, headers = auth_setup
        resp = client.get(f"/api/v1/chaos-streak/run?difficulty={invalid_diff}", headers=headers)
        assert resp.status_code == 400

    def test_reveal_endpoint(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        run = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        ).get_json()["run"]
        resp = client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run["id"]}, headers=headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["run"]["perks_revealed"] is True

    def test_result_lifecycle(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        run = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        ).get_json()["run"]
        resp = client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert "The Trapper" in body["run"]["completed_killers"]
        assert body["run"]["current_streak"] == 1

    def test_result_requires_killer_id(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        run = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        ).get_json()["run"]
        resp = client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_reset_endpoint(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        run = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        ).get_json()["run"]
        client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=headers,
        )
        resp = client.post(
            "/api/v1/chaos-streak/run/reset", json={"difficulty": "hell"}, headers=headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["run"]["current_streak"] == 0

    def test_stats_endpoint(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        resp = client.get("/api/v1/chaos-streak/stats?difficulty=hell", headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()["stats"]["total_matches"] == 0

    def test_runs_are_isolated_per_difficulty(
        self, client: FlaskClient, auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = auth_setup
        hell_run = client.get(
            "/api/v1/chaos-streak/run?difficulty=hell", headers=headers
        ).get_json()["run"]
        easy_run = client.get(
            "/api/v1/chaos-streak/run?difficulty=easy", headers=headers
        ).get_json()["run"]
        assert hell_run["id"] != easy_run["id"]
