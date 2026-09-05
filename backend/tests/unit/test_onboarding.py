# backend/tests/unit/test_onboarding.py
from flask.testing import FlaskClient

from app.models import User
from app.core.extensions import db


def test_fresh_user_has_no_onboarding_timestamp(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "onboardcheck",
            "email": "onboardcheck@example.com",
            "password": "password123",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.get_json()
    assert data["user"]["onboarding_completed_at"] is None

    token = data["token"]
    me_res = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["onboarding_completed_at"] is None


def test_mark_onboarding_complete_endpoint(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "onboardmarker",
            "email": "onboardmarker@example.com",
            "password": "password123",
        },
    )
    data = reg_res.get_json()
    token = data["token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    complete_res = client.post(
        f"/api/v1/users/{user_id}/onboarding/complete", headers=headers
    )
    assert complete_res.status_code == 200
    assert complete_res.get_json()["user"]["onboarding_completed_at"] is not None

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.get_json()["user"]["onboarding_completed_at"] is not None


def test_mark_onboarding_complete_rejects_other_users(client: FlaskClient) -> None:
    reg_a = client.post(
        "/api/v1/auth/register",
        json={"username": "userA", "email": "usera@example.com", "password": "password123"},
    ).get_json()
    reg_b = client.post(
        "/api/v1/auth/register",
        json={"username": "userB", "email": "userb@example.com", "password": "password123"},
    ).get_json()

    headers_a = {"Authorization": f"Bearer {reg_a['token']}"}
    res = client.post(
        f"/api/v1/users/{reg_b['user']['id']}/onboarding/complete", headers=headers_a
    )
    assert res.status_code == 403
