# backend/tests/unit/api/test_page_streak_routes.py
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.services.page_streak_service import PageStreakService
from app.services.user_service import UserService
from tests.unit.test_page_streak_service import FakePerkService, make_perks, seed_perks


@pytest.fixture(autouse=True)
def setup_page_streak_routes(app: Flask, db_session: Session) -> None:
    perks = make_perks(32, character="Nurse")
    seed_perks(perks)
    app.config["PAGE_STREAK_SERVICE"] = PageStreakService(
        perk_service=FakePerkService(perks),
    )


@pytest.fixture
def streak_auth_setup() -> tuple[int, str, dict[str, str]]:
    user_service = UserService()
    user, err = user_service.register_user("streakuser", "streak@test.com", "password123")
    assert err is None
    token = user_service.generate_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user.id, token, headers


@pytest.mark.unit
class TestPageStreakRoutes:
    """Tests for Page Streak challenge routes: roster status, runs, page completions, and resets."""

    def test_endpoints_require_login(self, client: FlaskClient) -> None:
        assert client.get("/api/v1/page-streak/roster").status_code == 401
        assert client.get("/api/v1/page-streak/run?killer=Nurse").status_code == 401
        assert (
            client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}).status_code == 401
        )

    def test_roster_endpoint(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        res = client.get("/api/v1/page-streak/roster", headers=headers)
        assert res.status_code == 200
        body = res.get_json()
        assert len(body["data"]) == 1
        assert body["data"][0]["killer"] == "Nurse"
        assert body["data"][0]["status"] == "not_started"

    def test_run_lifecycle(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        res = client.get("/api/v1/page-streak/run?killer=Nurse", headers=headers)
        assert res.status_code == 200
        assert res.get_json()["run"] is None

        res = client.post(
            "/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=headers
        )
        assert res.status_code == 201
        run = res.get_json()["run"]
        assert run["current_page"] == 1

        build = run["pages"][0][:4]
        res = client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 1, "perks": build, "result": "win"},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.get_json()["run"]["current_page"] == 2

        res = client.post(
            "/api/v1/page-streak/run/reset", json={"killer": "Nurse"}, headers=headers
        )
        assert res.status_code == 200
        assert res.get_json()["run"]["current_page"] == 1

    def test_result_validation_returns_400(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=headers)
        res = client.post(
            "/api/v1/page-streak/run/result",
            json={"killer": "Nurse", "page": 2, "perks": ["Perk 001"], "result": "win"},
            headers=headers,
        )
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_start_requires_killer(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        res = client.post("/api/v1/page-streak/run/start", json={}, headers=headers)
        assert res.status_code == 400

    def test_run_requires_killer_query_param(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        res = client.get("/api/v1/page-streak/run", headers=headers)
        assert res.status_code == 400

    def test_start_twice_returns_400(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=headers)
        res = client.post(
            "/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=headers
        )
        assert res.status_code == 400

    def test_runs_are_isolated_per_user(
        self, client: FlaskClient, streak_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = streak_auth_setup
        user_service = UserService()
        other, err = user_service.register_user("otherstreakuser", "other@test.com", "password123")
        assert err is None
        other_headers = {"Authorization": f"Bearer {user_service.generate_token(other.id)}"}

        client.post("/api/v1/page-streak/run/start", json={"killer": "Nurse"}, headers=headers)

        res = client.get("/api/v1/page-streak/run?killer=Nurse", headers=other_headers)
        assert res.get_json()["run"] is None

        res = client.get("/api/v1/page-streak/roster", headers=other_headers)
        assert res.get_json()["data"][0]["status"] == "not_started"
