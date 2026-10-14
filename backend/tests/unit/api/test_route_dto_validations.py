# backend/tests/unit/api/test_route_dto_validations.py
"""Tests asserting malformed JSON payloads return HTTP 400 validation errors across routes."""
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.services.user_service import UserService


@pytest.fixture
def test_user_headers(db_session: Session) -> dict[str, str]:
    user_service = UserService()
    user, err = user_service.register_user("dtouser", "dtouser", "dto@test.com", "password123")
    assert err is None
    token = user_service.generate_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_admin_headers(db_session: Session) -> dict[str, str]:
    user_service = UserService()
    user, err = user_service.register_user("dtoadmin", "dtoadmin", "dtoadmin@test.com", "password123", role="admin")
    assert err is None
    token = user_service.generate_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.unit
def test_minigames_malformed_json_returns_400(client: FlaskClient, test_user_headers: dict[str, str]) -> None:
    # Malformed stats payload
    res = client.post("/api/v1/minigames/stats", json={"won": "not_a_bool_or_invalid_structure"}, headers=test_user_headers)
    assert res.status_code in (400, 422)

    # Malformed guess payload (missing guess_id)
    res_guess = client.post("/api/v1/minigames/guess", json={"round_index": "invalid_int"})
    assert res_guess.status_code in (400, 422)


@pytest.mark.unit
def test_synergy_malformed_json_returns_400(client: FlaskClient) -> None:
    res = client.post("/api/v1/synergy/analyze", json={"perks": "not_a_list"})
    assert res.status_code in (400, 422)


@pytest.mark.unit
def test_streaks_malformed_json_returns_400(client: FlaskClient, test_user_headers: dict[str, str]) -> None:
    # Page streak start without killer
    res = client.post("/api/v1/page-streak/run/start", json={"killer": ""}, headers=test_user_headers)
    assert res.status_code in (400, 422)

    # Chaos streak result with invalid types
    res_chaos = client.post("/api/v1/chaos-streak/result", json={"run_id": "not_int", "result": "draw"}, headers=test_user_headers)
    assert res_chaos.status_code in (400, 422)

    # History streak result with invalid result
    res_hist = client.post("/api/v1/history-streak/result", json={"run_id": 1, "result": "invalid", "killer_id": "Trapper"}, headers=test_user_headers)
    assert res_hist.status_code in (400, 422)

    # Gauntlet streak boost with invalid boost type
    res_boost = client.post("/api/v1/gauntlet-streak/boost", json={"run_id": 1, "boost": "superpower"}, headers=test_user_headers)
    assert res_boost.status_code in (400, 422)


@pytest.mark.unit
def test_google_auth_malformed_json_returns_400(client: FlaskClient) -> None:
    res = client.post("/api/v1/auth/google", json={})
    assert res.status_code in (400, 422)


@pytest.mark.unit
def test_admin_malformed_json_returns_400(client: FlaskClient, test_admin_headers: dict[str, str]) -> None:
    # Malformed site settings (not dict)
    res = client.put("/api/v1/admin/settings", json={"settings": "not_a_dict"}, headers=test_admin_headers)
    assert res.status_code in (400, 422)

    # Malformed purge targets (not list)
    res_purge = client.post("/api/v1/admin/database/purge", json={"targets": "not_a_list"}, headers=test_admin_headers)
    assert res_purge.status_code in (400, 422)
