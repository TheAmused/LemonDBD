# backend/tests/unit/auth/test_verification_before_sign_in.py
"""With "email verification required" on, an account confirms its address before it gets a session.

The setting promised that, but sign-up and sign-in both handed out a session to an unconfirmed
account. Now they return a short-lived token instead, and entering the code with it finishes the
sign-in (through the second factor when the account has one).
"""
from unittest.mock import patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core import totp
from app.core.extensions import db
from app.core.security import SESSION_COOKIE_NAME, generate_token, hash_password
from app.models import User

PASSWORD = "password123"


@pytest.fixture(autouse=True)
def _required(app: Flask, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", True)
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")
    with patch("app.services.user.auth.send_verification_email"):
        yield


def _session_cookie(res) -> bool:
    return any(SESSION_COOKIE_NAME in header for header in res.headers.getlist("Set-Cookie"))


def _code(login: str) -> str:
    db.session.expire_all()
    return db.session.query(User).filter_by(login=login).one().verification_code


@pytest.mark.unit
def test_sign_up_gives_no_session_until_the_code_is_entered(client: FlaskClient, db_session) -> None:
    res = client.post("/api/v1/auth/register", json={"login": "newbie", "username": "Newbie", "email": "newbie@example.com", "password": PASSWORD})
    assert res.status_code == 201
    body = res.get_json()
    assert body["status"] == "verification_required" and "token" not in body and not _session_cookie(res)

    done = client.post("/api/v1/auth/verify-email", json={"email": "newbie@example.com", "code": _code("newbie"), "verification_token": body["verification_token"]})
    assert done.status_code == 200 and _session_cookie(done)
    assert done.get_json()["user"]["is_verified"] is True


@pytest.mark.unit
def test_sign_in_with_an_unconfirmed_address_asks_for_the_code(client: FlaskClient, db_session) -> None:
    db.session.add(User(login="later", username="later", email="later@example.com", password_hash=hash_password(PASSWORD), is_verified=False))
    db.session.commit()
    res = client.post("/api/v1/auth/login", json={"login": "later", "password": PASSWORD})
    assert res.status_code == 403 and not _session_cookie(res)
    body = res.get_json()
    assert body["error_code"] == "email_not_verified" and body["email"] == "later@example.com"
    # A wrong password never reaches this step: it stays a plain 401.
    assert client.post("/api/v1/auth/login", json={"login": "later", "password": "wrong"}).status_code == 401

    done = client.post("/api/v1/auth/verify-email", json={"email": "later@example.com", "code": _code("later"), "verification_token": body["verification_token"]})
    assert done.status_code == 200 and _session_cookie(done)


@pytest.mark.unit
def test_the_code_alone_never_opens_a_session(client: FlaskClient, db_session) -> None:
    """Without the token from the password step (or with someone else's), verifying only confirms the address."""
    for login in ("one", "two"):
        db.session.add(User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password(PASSWORD), is_verified=False))
    db.session.commit()
    token_for_two = client.post("/api/v1/auth/login", json={"login": "two", "password": PASSWORD}).get_json()["verification_token"]
    client.post("/api/v1/auth/login", json={"login": "one", "password": PASSWORD})
    res = client.post("/api/v1/auth/verify-email", json={"email": "one@example.com", "code": _code("one"), "verification_token": token_for_two})
    assert res.status_code == 200 and not _session_cookie(res)
    # The pending token is not a session token either.
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_for_two}"}).get_json()["authenticated"] is False


@pytest.mark.unit
def test_an_account_with_two_factor_still_needs_its_code_after_confirming(client: FlaskClient, db_session) -> None:
    user = User(login="careful", username="careful", email="careful@example.com", password_hash=hash_password(PASSWORD), is_verified=True)
    db.session.add(user)
    db.session.commit()
    headers = {"Authorization": f"Bearer {generate_token(user.id, 'user')}"}
    secret = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=headers).get_json()["secret"]
    assert client.post("/api/v1/auth/two-factor/enable", json={"code": totp.totp(secret)}, headers=headers).status_code == 200
    db.session.expire_all()
    user = db.session.get(User, user.id)
    user.is_verified = False  # e.g. after an e-mail change
    db.session.commit()

    pending = client.post("/api/v1/auth/login", json={"login": "careful", "password": PASSWORD}).get_json()
    assert pending["error_code"] == "email_not_verified"
    res = client.post("/api/v1/auth/verify-email", json={"email": "careful@example.com", "code": _code("careful"), "verification_token": pending["verification_token"]})
    assert res.status_code == 200 and not _session_cookie(res)
    assert res.get_json()["status"] == "two_factor_required"


@pytest.mark.unit
def test_with_the_setting_off_sign_in_works_as_before(client: FlaskClient, db_session, app: Flask, monkeypatch) -> None:
    monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", False)
    db.session.add(User(login="relaxed", username="relaxed", email="relaxed@example.com", password_hash=hash_password(PASSWORD), is_verified=False))
    db.session.commit()
    res = client.post("/api/v1/auth/login", json={"login": "relaxed", "password": PASSWORD})
    assert res.status_code == 200 and _session_cookie(res)
