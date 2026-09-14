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


def test_set_preferred_language_endpoint(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "langpicker",
            "email": "langpicker@example.com",
            "password": "password123",
        },
    )
    data = reg_res.get_json()
    assert data["user"]["preferred_language"] is None

    token = data["token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        f"/api/v1/users/{user_id}/language", json={"language": "pl"}, headers=headers
    )
    assert res.status_code == 200
    assert res.get_json()["user"]["preferred_language"] == "pl"

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.get_json()["user"]["preferred_language"] == "pl"


def test_set_preferred_language_rejects_unsupported_locale(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "badlangpicker",
            "email": "badlangpicker@example.com",
            "password": "password123",
        },
    )
    data = reg_res.get_json()
    headers = {"Authorization": f"Bearer {data['token']}"}

    res = client.post(
        f"/api/v1/users/{data['user']['id']}/language",
        json={"language": "xx"},
        headers=headers,
    )
    assert res.status_code == 400


def test_set_preferred_language_rejects_other_users(client: FlaskClient) -> None:
    reg_a = client.post(
        "/api/v1/auth/register",
        json={"username": "langA", "email": "langa@example.com", "password": "password123"},
    ).get_json()
    reg_b = client.post(
        "/api/v1/auth/register",
        json={"username": "langB", "email": "langb@example.com", "password": "password123"},
    ).get_json()

    headers_a = {"Authorization": f"Bearer {reg_a['token']}"}
    res = client.post(
        f"/api/v1/users/{reg_b['user']['id']}/language",
        json={"language": "de"},
        headers=headers_a,
    )
    assert res.status_code == 403


# `test_onboarding_flag_migration_is_idempotent` used to exercise a standalone
# `onboarding_flag_001` migration directly. That revision (and every other
# per-feature migration that predated it) was squashed into
# `migrations/versions/0001_initial_schema.py` -- one baseline revision that
# builds the whole schema from the current models with `checkfirst=True`, so
# there is no longer a standalone `upgrade()` for `onboarding_completed_at` to
# call idempotently. `0001_initial_schema.py`'s own idempotency (safe to run
# against a database that already has the column, via `checkfirst=True`) is
# what this test would exercise now; it is covered by every other test in
# this file, all of which run against a schema `db.create_all()` already
# built.

