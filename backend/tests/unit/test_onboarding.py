# backend/tests/unit/test_onboarding.py
from flask.testing import FlaskClient


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
