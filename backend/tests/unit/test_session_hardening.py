# backend/tests/unit/test_session_hardening.py
"""Session tokens carry a type and a credential version; profile changes need the current password."""
import jwt
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.config import weak_secret_warnings
from app.core.extensions import db
from app.core.security import SESSION_COOKIE_NAME, decode_token, generate_token, hash_password
from app.models import User

PASSWORD = "password123"


def _make_user(name: str = "hardened") -> User:
    user = User(
        username=name,
        email=f"{name}@example.com",
        password_hash=hash_password(PASSWORD),
        is_verified=True,
    )
    db.session.add(user)
    db.session.commit()
    return user


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _forge(app: Flask, user: User, **claims: object) -> str:
    """A token signed with the real key, so only the claims decide whether it is accepted."""
    payload = {"sub": str(user.id), "role": user.role, "exp": 4_102_444_800, **claims}
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm=app.config["JWT_ALGORITHM"])


@pytest.mark.unit
class TestTokenClaims:
    def test_new_tokens_are_access_tokens_with_the_current_version(self, app: Flask, db_session) -> None:
        user = _make_user()
        user.token_version = 3
        db.session.commit()
        payload = decode_token(generate_token(user.id, user.role))
        assert payload["typ"] == "access"
        assert payload["ver"] == 3

    def test_legacy_token_without_claims_still_works_at_version_zero(
        self, app: Flask, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        res = client.get("/api/v1/auth/me", headers=_bearer(_forge(app, user)))
        assert res.get_json()["authenticated"] is True

    def test_token_of_another_type_is_not_a_session(
        self, app: Flask, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        token = generate_token(user.id, user.role, token_type="2fa")
        assert client.get("/api/v1/auth/me", headers=_bearer(token)).get_json()["authenticated"] is False
        # nor through the cookie or the query string
        client.set_cookie(SESSION_COOKIE_NAME, token)
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is False
        client.delete_cookie(SESSION_COOKIE_NAME)
        assert client.get(f"/api/v1/auth/me?token={token}").get_json()["authenticated"] is False

    def test_service_level_verification_applies_the_same_rules(self, app: Flask, db_session) -> None:
        from app.services.user_service import UserService

        user = _make_user()
        service = UserService()
        assert service.verify_token(generate_token(user.id, user.role)) is not None
        assert service.verify_token(generate_token(user.id, user.role, token_type="2fa")) is None
        user.token_version = 1
        db.session.commit()
        assert service.verify_token(generate_token(user.id, user.role, token_version=0)) is None

    @pytest.mark.parametrize("bad_version", ["nope", None, [1]])
    def test_garbage_version_claim_is_rejected(
        self, app: Flask, client: FlaskClient, db_session, bad_version: object
    ) -> None:
        user = _make_user()
        token = _forge(app, user, ver=bad_version)
        assert client.get("/api/v1/auth/me", headers=_bearer(token)).get_json()["authenticated"] is False


@pytest.mark.unit
class TestPasswordChangeSignsOutOtherSessions:
    def test_profile_password_change_invalidates_old_tokens_and_reissues_one(
        self, app: Flask, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        old_token = generate_token(user.id, user.role)
        res = client.put(
            "/api/v1/auth/profile",
            json={"new_password": "brand-new-pass", "current_password": PASSWORD},
            headers=_bearer(old_token),
        )
        assert res.status_code == 200
        body = res.get_json()
        assert any(h.startswith(f"{SESSION_COOKIE_NAME}=") for h in res.headers.getlist("Set-Cookie"))
        assert decode_token(body["token"])["ver"] == 1

        other = app.test_client()
        assert other.get("/api/v1/auth/me", headers=_bearer(old_token)).get_json()["authenticated"] is False
        assert other.get("/api/v1/auth/me", headers=_bearer(body["token"])).get_json()["authenticated"] is True
        # the browser that made the change stays signed in through its fresh cookie
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is True

    def test_password_reset_invalidates_old_tokens(self, app: Flask, client: FlaskClient, db_session) -> None:
        from datetime import datetime, timedelta, timezone

        user = _make_user()
        old_token = generate_token(user.id, user.role)
        user.reset_token = "reset-me"
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        db.session.commit()

        res = client.post(
            "/api/v1/auth/reset-password", json={"token": "reset-me", "new_password": "another-pass"}
        )
        assert res.status_code == 200
        assert client.get("/api/v1/auth/me", headers=_bearer(old_token)).get_json()["authenticated"] is False
        login = client.post("/api/v1/auth/login", json={"username": user.username, "password": "another-pass"})
        assert login.status_code == 200
        assert decode_token(login.get_json()["token"])["ver"] == 1

    def test_changing_only_the_avatar_keeps_sessions(self, app: Flask, client: FlaskClient, db_session) -> None:
        user = _make_user()
        token = generate_token(user.id, user.role)
        res = client.put("/api/v1/auth/profile", json={"avatar_url": "custom"}, headers=_bearer(token))
        assert res.status_code == 200
        assert "token" not in res.get_json()
        assert client.get("/api/v1/auth/me", headers=_bearer(token)).get_json()["authenticated"] is True


@pytest.mark.unit
class TestProfileNeedsCurrentPassword:
    @pytest.mark.parametrize(
        "change",
        [{"email": "new-address@example.com"}, {"new_password": "brand-new-pass"}],
    )
    def test_missing_current_password_is_refused(
        self, app: Flask, client: FlaskClient, db_session, change: dict[str, str]
    ) -> None:
        user = _make_user()
        res = client.put("/api/v1/auth/profile", json=change, headers=_bearer(generate_token(user.id, user.role)))
        assert res.status_code == 400
        db.session.refresh(user)
        assert user.email == "hardened@example.com"
        assert user.token_version == 0

    @pytest.mark.parametrize(
        "change",
        [{"email": "new-address@example.com"}, {"new_password": "brand-new-pass"}],
    )
    def test_wrong_current_password_is_refused(
        self, app: Flask, client: FlaskClient, db_session, change: dict[str, str]
    ) -> None:
        user = _make_user()
        res = client.put(
            "/api/v1/auth/profile",
            json={**change, "current_password": "not-my-password"},
            headers=_bearer(generate_token(user.id, user.role)),
        )
        assert res.status_code == 403
        db.session.refresh(user)
        assert user.email == "hardened@example.com"
        assert user.token_version == 0

    def test_same_email_needs_no_password(self, app: Flask, client: FlaskClient, db_session) -> None:
        user = _make_user()
        res = client.put(
            "/api/v1/auth/profile",
            json={"email": user.email.upper(), "avatar_url": "other"},
            headers=_bearer(generate_token(user.id, user.role)),
        )
        assert res.status_code == 200

    def test_short_new_password_is_rejected_before_anything_changes(
        self, app: Flask, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        res = client.put(
            "/api/v1/auth/profile",
            json={"email": "x@example.com", "new_password": "123", "current_password": PASSWORD},
            headers=_bearer(generate_token(user.id, user.role)),
        )
        assert res.status_code == 400
        db.session.refresh(user)
        assert user.email == "hardened@example.com"


@pytest.mark.unit
class TestWeakSecretWarnings:
    GOOD = "k3Jx9-" + "a" * 40

    def _config(self, **overrides: object) -> dict[str, object]:
        return {"SECRET_KEY": self.GOOD, "JWT_SECRET_KEY": self.GOOD, **overrides}

    def test_strong_keys_raise_no_warning(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "production")
        assert weak_secret_warnings(self._config()) == []

    def test_placeholders_and_short_keys_are_reported(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("FLASK_ENV", "production")
        problems = weak_secret_warnings(
            self._config(SECRET_KEY="dev-secret-key-dbd-lemon-2026", JWT_SECRET_KEY="short")
        )
        assert len(problems) == 2
        assert "SECRET_KEY" in problems[0] and "placeholder" in problems[0]
        assert "JWT_SECRET_KEY" in problems[1] and "shorter" in problems[1]

    def test_development_and_testing_are_exempt(self, monkeypatch: pytest.MonkeyPatch) -> None:
        weak = self._config(SECRET_KEY="changeme", JWT_SECRET_KEY="changeme")
        monkeypatch.setenv("FLASK_ENV", "development")
        assert weak_secret_warnings(weak) == []
        monkeypatch.setenv("FLASK_ENV", "production")
        assert weak_secret_warnings({**weak, "TESTING": True}) == []

    def test_create_app_logs_the_warning(
        self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
    ) -> None:
        from app import create_app
        from app.core.config import TestingConfig

        class WeakConfig(TestingConfig):
            TESTING = False
            SECRET_KEY = "changeme"
            JWT_SECRET_KEY = "changeme"

        monkeypatch.setenv("FLASK_ENV", "production")
        with caplog.at_level("WARNING"):
            create_app(WeakConfig)
        assert "SECURITY: SECRET_KEY is a publicly known placeholder value" in caplog.text
