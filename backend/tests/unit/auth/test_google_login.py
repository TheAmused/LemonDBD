# backend/tests/unit/auth/test_google_login.py
import re

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import SESSION_COOKIE_NAME, generate_token, hash_password
from app.models import User
from app.services.user import google_auth
from app.services.user.google_auth import GoogleAuthError, GoogleIdentity

URL = "/api/v1/auth/google"


@pytest.fixture(autouse=True)
def _configured(app: Flask) -> None:
    app.config["GOOGLE_CLIENT_ID"] = "test-client.apps.googleusercontent.com"


@pytest.fixture
def as_google(monkeypatch: pytest.MonkeyPatch):
    def _set(sub: str, email: str) -> None:
        monkeypatch.setattr(
            google_auth, "verify_id_token", lambda credential: GoogleIdentity(sub=sub, email=email)
        )

    return _set


def _user(name: str, **overrides: object) -> User:
    user = User(
        login=name, username=name,
        email=f"{name}@example.com",
        password_hash=hash_password("password123"),
        is_verified=True,
        **overrides,
    )
    db.session.add(user)
    db.session.commit()
    return user


def test_config_hidden_without_client_id(app: Flask, client: FlaskClient) -> None:
    app.config["GOOGLE_CLIENT_ID"] = ""
    assert client.get(f"{URL}/config").get_json() == {"enabled": False, "client_id": ""}


def test_config_exposes_client_id(client: FlaskClient) -> None:
    body = client.get(f"{URL}/config").get_json()
    assert body == {"enabled": True, "client_id": "test-client.apps.googleusercontent.com"}


def test_unconfigured_server_refuses(app: Flask, client: FlaskClient) -> None:
    app.config["GOOGLE_CLIENT_ID"] = ""
    assert client.post(URL, json={"credential": "x"}).status_code == 503


def test_bad_credential_is_rejected(client: FlaskClient) -> None:
    assert client.post(URL, json={"credential": "not-a-jwt"}).status_code == 401
    assert client.post(URL, json={}).status_code == 400


def test_first_sign_in_creates_a_verified_passwordless_account(
    client: FlaskClient, as_google
) -> None:
    as_google("sub-1", "jane.doe@gmail.com")
    res = client.post(URL, json={"credential": "x"})
    assert res.status_code == 201
    body = res.get_json()
    assert re.fullmatch(r"player\d{8}", body["user"]["login"])
    assert body["user"]["username"] == "jane.doe"
    assert body["user"]["email"] == "jane.doe@gmail.com"
    assert body["user"]["is_verified"] is True
    assert body["user"]["has_password"] is False
    assert body["user"]["google_linked"] is True
    assert SESSION_COOKIE_NAME in res.headers.get("Set-Cookie", "")

    again = client.post(URL, json={"credential": "x"})
    assert again.status_code == 200
    assert again.get_json()["user"]["id"] == body["user"]["id"]


def test_existing_verified_account_is_linked_and_keeps_its_password(
    client: FlaskClient, as_google
) -> None:
    existing = _user("sam")
    as_google("sub-sam", "sam@example.com")
    res = client.post(URL, json={"credential": "x"})
    assert res.status_code == 200
    db.session.refresh(existing)
    assert existing.google_sub == "sub-sam"
    assert existing.has_password
    assert client.post(
        "/api/v1/auth/login", json={"login": "sam", "password": "password123"}
    ).status_code == 200


def test_linking_an_unverified_account_drops_the_squatters_password(
    client: FlaskClient, as_google
) -> None:
    squatted = _user("victim")
    squatted.is_verified = False
    version = squatted.token_version
    db.session.commit()

    as_google("sub-victim", "victim@example.com")
    assert client.post(URL, json={"credential": "x"}).status_code == 200

    db.session.refresh(squatted)
    assert squatted.is_verified is True
    assert squatted.password_hash is None
    assert squatted.token_version == version + 1
    assert client.post(
        "/api/v1/auth/login", json={"login": "victim", "password": "password123"}
    ).status_code == 401


def test_email_linked_to_another_google_account_is_refused(
    client: FlaskClient, as_google
) -> None:
    _user("kim", google_sub="sub-original")
    as_google("sub-impostor", "kim@example.com")
    assert client.post(URL, json={"credential": "x"}).status_code == 409


def test_disabled_account_cannot_sign_in(client: FlaskClient, as_google) -> None:
    _user("off", google_sub="sub-off", is_active=False)
    as_google("sub-off", "off@example.com")
    assert client.post(URL, json={"credential": "x"}).status_code == 403


def test_login_is_random_digits_not_the_email(app: Flask) -> None:
    with app.app_context():
        name = google_auth.unique_login()
    assert re.fullmatch(r"player\d{8}", name)


def test_taken_login_is_retried(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    numbers = iter([42, 42, 7])
    monkeypatch.setattr(google_auth.secrets, "randbelow", lambda limit: next(numbers))
    with app.app_context():
        _user("player00000042")
        assert google_auth.unique_login() == "player00000007"


def test_display_username_comes_from_the_email_and_stays_within_limits(app: Flask) -> None:
    assert google_auth.display_username("Jane.Doe@gmail.com") == "Jane.Doe"
    assert len(google_auth.display_username(f"{'a' * 60}@example.com")) == 50
    assert len(google_auth.display_username("a@example.com")) >= 3
    assert len(google_auth.display_username("++@example.com")) >= 3


def test_passwordless_account_cannot_log_in_with_a_password_or_change_it(
    client: FlaskClient, as_google
) -> None:
    as_google("sub-g", "gina@example.com")
    client.post(URL, json={"credential": "x"})
    user = db.session.query(User).filter_by(email="gina@example.com").one()

    assert client.post(
        "/api/v1/auth/login", json={"login": "gina@example.com", "password": "anything1"}
    ).status_code == 401
    headers = {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}
    res = client.put(
        "/api/v1/auth/profile", json={"new_password": "newpass123"}, headers=headers
    )
    assert res.status_code == 400


def test_passwordless_account_can_set_a_password_by_reset_link(
    client: FlaskClient, as_google, monkeypatch: pytest.MonkeyPatch
) -> None:
    sent: list[str] = []
    monkeypatch.setattr("app.services.user.auth.send_password_reset_email", lambda user, token: sent.append(token))
    as_google("sub-r", "rita@example.com")
    client.post(URL, json={"credential": "x"})
    assert db.session.query(User).filter_by(email="rita@example.com").one()  # the Google sign-in made it

    assert client.post("/api/v1/auth/forgot-password", json={"email": "rita@example.com"}).status_code == 200
    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": sent[0], "new_password": "brandnew123"},
    )
    assert res.status_code == 200
    assert client.post(
        "/api/v1/auth/login", json={"login": "rita@example.com", "password": "brandnew123"}
    ).status_code == 200


def test_passwordless_account_deletes_itself_with_a_fresh_google_credential(
    client: FlaskClient, as_google
) -> None:
    as_google("sub-d", "dan@example.com")
    client.post(URL, json={"credential": "x"})
    user = db.session.query(User).filter_by(email="dan@example.com").one()
    headers = {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}

    refused = client.delete("/api/v1/auth/account", json={"password": ""}, headers=headers)
    assert refused.status_code == 403
    assert db.session.query(User).filter_by(email="dan@example.com").count() == 1

    as_google("sub-other", "dan@example.com")
    assert client.delete(
        "/api/v1/auth/account", json={"google_credential": "x"}, headers=headers
    ).status_code == 403

    as_google("sub-d", "dan@example.com")
    assert client.delete(
        "/api/v1/auth/account", json={"google_credential": "x"}, headers=headers
    ).status_code == 200


def test_unverified_google_email_is_rejected(monkeypatch: pytest.MonkeyPatch, app: Flask) -> None:
    class _Key:
        key = "unused"

    monkeypatch.setattr(google_auth._jwk_client, "get_signing_key_from_jwt", lambda token: _Key())
    monkeypatch.setattr(
        google_auth.jwt, "decode", lambda *a, **k: {"sub": "s", "email": "x@y.com", "email_verified": False}
    )
    with app.app_context(), pytest.raises(GoogleAuthError) as err:
        google_auth.verify_id_token("token")
    assert err.value.status == 403
