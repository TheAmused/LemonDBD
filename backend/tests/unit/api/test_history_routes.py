# backend/tests/unit/api/test_history_routes.py
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session
from app.models import Character, Perk
from app.services.user_service import UserService


def seed_killer(name: str, release_number: int, perk_count: int = 2) -> Character:
    from app.core.extensions import db

    character = Character(name=name, role="Killer", release_number=release_number)
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
def history_auth_setup(db_session: Session) -> tuple[int, str, dict[str, str]]:
    seed_killer("The Trapper", release_number=1)
    seed_killer("The Wraith", release_number=2)

    user_service = UserService()
    user, err = user_service.register_user("routeuser", "route@test.com", "password123")
    assert err is None
    token = user_service.authenticate("routeuser", "password123")[1]
    headers = {"Authorization": f"Bearer {token}"}
    return user.id, token, headers


@pytest.mark.unit
class TestHistoryRoutes:
    """Tests for History mode API routes: chronological unlocks, rows, and resets."""

    def test_endpoints_require_login(self, client: FlaskClient) -> None:
        resp = client.get("/api/v1/history-streak/run?mode=hell")
        assert resp.status_code == 401

    def test_get_run_auto_creates(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = history_auth_setup
        resp = client.get("/api/v1/history-streak/run?mode=hell", headers=headers)
        assert resp.status_code == 200
        run = resp.get_json()["run"]
        assert run["mode"] == "hell"
        assert run["current_row_killers"] == ["The Trapper", "The Wraith"]

    @pytest.mark.parametrize("invalid_mode", ["easy", "invalid_custom", ""])
    def test_run_requires_valid_mode(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]], invalid_mode: str
    ) -> None:
        _, _, headers = history_auth_setup
        resp = client.get(f"/api/v1/history-streak/run?mode={invalid_mode}", headers=headers)
        assert resp.status_code == 400

    def test_result_lifecycle(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = history_auth_setup
        run = client.get(
            "/api/v1/history-streak/run?mode=hell", headers=headers
        ).get_json()["run"]
        resp = client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.get_json()["run"]
        assert "The Trapper" in body["completed_killers"]
        assert len(body["newly_unlocked_perks"]) > 0

    def test_result_requires_killer_id(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = history_auth_setup
        run = client.get(
            "/api/v1/history-streak/run?mode=hell", headers=headers
        ).get_json()["run"]
        resp = client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win"},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_reset_endpoint(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = history_auth_setup
        run = client.get(
            "/api/v1/history-streak/run?mode=hell", headers=headers
        ).get_json()["run"]
        client.post(
            "/api/v1/history-streak/result",
            json={"run_id": run["id"], "result": "win", "killer_id": "The Trapper"},
            headers=headers,
        )
        resp = client.post(
            "/api/v1/history-streak/run/reset", json={"mode": "hell"}, headers=headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["run"]["total_killers_beaten"] == 0

    def test_stats_endpoint(
        self, client: FlaskClient, history_auth_setup: tuple[int, str, dict[str, str]]
    ) -> None:
        _, _, headers = history_auth_setup
        resp = client.get("/api/v1/history-streak/stats?mode=hell", headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()["stats"]["total_matches"] == 0
