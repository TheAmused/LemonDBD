# backend/tests/unit/auth/test_session_revocation.py
"""Signing out revokes the token itself, sign-out-everywhere ends every session, and browsers
never receive the session token in a response body."""
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import SESSION_COOKIE_NAME, decode_token, generate_token, hash_password
from app.models import RevokedSession, User

PASSWORD = "password123"


def _make_user(name: str = "revoker") -> User:
    user = User(
        login=name, username=name, email=f"{name}@example.com",
        password_hash=hash_password(PASSWORD), is_verified=True,
    )
    db.session.add(user)
    db.session.commit()
    return user


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _me(client: FlaskClient, **kwargs) -> bool:
    return client.get("/api/v1/auth/me", **kwargs).get_json()["authenticated"] is True


def _session_cookie(client: FlaskClient) -> str | None:
    cookie = client.get_cookie(SESSION_COOKIE_NAME)
    return cookie.value if cookie else None


@pytest.mark.unit
class TestTokenNotInBody:
    def test_browser_sign_in_gets_only_the_cookie(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        res = client.post("/api/v1/auth/login", json={"login": user.login, "password": PASSWORD})
        assert res.status_code == 200
        body = res.get_json()
        assert "token" not in body and "token_type" not in body
        assert body["session"] is True
        assert _session_cookie(client)

    def test_api_client_can_ask_for_the_token(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        res = client.post(
            "/api/v1/auth/login",
            json={"login": user.login, "password": PASSWORD},
            headers={"X-Return-Token": "1"},
        )
        body = res.get_json()
        assert body["token_type"] == "Bearer" and decode_token(body["token"])["sub"] == str(user.id)


@pytest.mark.unit
class TestLogoutRevokes:
    def test_a_copied_cookie_stops_working_after_logout(self, app: Flask, client: FlaskClient, db_session) -> None:
        user = _make_user()
        client.post("/api/v1/auth/login", json={"login": user.login, "password": PASSWORD})
        stolen = _session_cookie(client)
        assert stolen and _me(client)

        assert client.post("/api/v1/auth/logout").status_code == 200
        thief = app.test_client()
        thief.set_cookie(SESSION_COOKIE_NAME, stolen)
        assert _me(thief) is False

    def test_bearer_logout_revokes_only_that_token(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        first, second = generate_token(user.id, user.role), generate_token(user.id, user.role)
        assert client.post("/api/v1/auth/logout", headers=_bearer(first)).status_code == 200
        assert _me(client, headers=_bearer(first)) is False
        assert _me(client, headers=_bearer(second)) is True
        assert db.session.query(RevokedSession).count() == 1

    def test_logout_without_a_session_is_harmless(self, client: FlaskClient, db_session) -> None:
        assert client.post("/api/v1/auth/logout").status_code == 200
        assert client.post("/api/v1/auth/logout", headers=_bearer("not-a-token")).status_code == 200
        assert db.session.query(RevokedSession).count() == 0


@pytest.mark.unit
class TestSignOutEverywhere:
    def test_every_session_ends(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        laptop, phone = generate_token(user.id, user.role), generate_token(user.id, user.role)
        res = client.post("/api/v1/auth/logout-all", headers=_bearer(laptop))
        assert res.status_code == 200
        assert _me(client, headers=_bearer(laptop)) is False
        assert _me(client, headers=_bearer(phone)) is False
        db.session.refresh(user)
        assert user.token_version == 1

    def test_requires_a_session(self, client: FlaskClient) -> None:
        assert client.post("/api/v1/auth/logout-all").status_code == 401


@pytest.mark.unit
class TestAuthorizationHeaderAndCookie:
    def test_a_non_bearer_header_does_not_bypass_the_origin_check(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        client.post("/api/v1/auth/login", json={"login": user.login, "password": PASSWORD})
        res = client.put(
            "/api/v1/auth/profile",
            json={"email": "elsewhere@example.com"},
            headers={"Authorization": "x", "Origin": "https://evil.example"},
        )
        assert res.status_code == 403

    def test_a_non_bearer_header_does_not_fall_back_to_the_cookie(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        client.post("/api/v1/auth/login", json={"login": user.login, "password": PASSWORD})
        assert _me(client) is True
        assert _me(client, headers={"Authorization": "Basic Zm9vOmJhcg=="}) is False


@pytest.mark.unit
def test_expired_revocations_are_purged(db_session) -> None:
    from app.core.security import purge_expired_revocations

    now = datetime.now(timezone.utc)
    db.session.add_all([
        RevokedSession(jti="old", expires_at=now - timedelta(minutes=1)),
        RevokedSession(jti="live", expires_at=now + timedelta(hours=1)),
    ])
    db.session.commit()
    assert purge_expired_revocations() == 1
    assert [row.jti for row in db.session.query(RevokedSession).all()] == ["live"]
