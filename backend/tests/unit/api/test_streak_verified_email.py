# backend/tests/unit/api/test_streak_verified_email.py
"""With "email verification required" on, the challenge API itself refuses unconfirmed accounts.

The challenges page already showed "verify your e-mail" instead of the game; the API let the run go
ahead, so the rule was the browser's alone.
"""
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import generate_token, hash_password
from app.models import User


def _account(login: str, verified: bool) -> dict[str, str]:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password("password123"), is_verified=verified)
    db.session.add(user)
    db.session.commit()
    return {"Authorization": f"Bearer {generate_token(user.id, 'user')}"}


@pytest.mark.unit
@pytest.mark.parametrize(
    "method,url",
    [
        ("get", "/api/v1/gauntlet-streak/run?role=killer"),
        ("post", "/api/v1/gauntlet-streak/result"),
        ("post", "/api/v1/chaos-streak/result"),
        ("post", "/api/v1/page-streak/run/start"),
    ],
)
def test_an_unconfirmed_account_cannot_track_challenges(client: FlaskClient, db_session, app: Flask, monkeypatch, method, url) -> None:
    monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", True)
    res = getattr(client, method)(url, json={}, headers=_account("fresh", verified=False)) if method == "post" else client.get(url, headers=_account("fresh", verified=False))
    assert res.status_code == 403
    assert res.get_json()["code"] == "email_not_verified"


@pytest.mark.unit
def test_a_confirmed_account_and_a_switched_off_setting_are_unaffected(client: FlaskClient, db_session, app: Flask, monkeypatch) -> None:
    monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", True)
    assert client.get("/api/v1/gauntlet-streak/run?role=killer", headers=_account("done", verified=True)).status_code != 403
    monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", False)
    assert client.get("/api/v1/gauntlet-streak/run?role=killer", headers=_account("fresh2", verified=False)).status_code != 403
