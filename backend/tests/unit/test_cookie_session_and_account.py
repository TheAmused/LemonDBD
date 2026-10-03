# backend/tests/unit/test_cookie_session_and_account.py
"""HttpOnly cookie session, cross-site write guard, admin settings and self-service deletion."""
import jwt
import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core.extensions import db
from app.core.security import SESSION_COOKIE_NAME, generate_token, hash_password
from app.models import BugReport, User

PASSWORD = "password123"


def _register(client: FlaskClient, name: str) -> dict:
    res = client.post(
        "/api/v1/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": PASSWORD},
    )
    assert res.status_code == 201
    return res


def _make_admin(name: str = "boss") -> tuple[User, str]:
    user = User(
        username=name,
        email=f"{name}@example.com",
        password_hash=hash_password(PASSWORD),
        role="admin",
        is_verified=True,
    )
    db.session.add(user)
    db.session.commit()
    return user, generate_token(user.id, role="admin")


@pytest.mark.unit
class TestCookieSession:
    def test_register_and_login_set_an_httponly_cookie(self, client: FlaskClient) -> None:
        res = _register(client, "cookieuser")
        header = next(
            h for h in res.headers.getlist("Set-Cookie") if h.startswith(f"{SESSION_COOKIE_NAME}=") and "Max-Age=0" not in h
        )
        assert "HttpOnly" in header
        assert "SameSite=Lax" in header
        assert "Path=/;" in header or header.rstrip().endswith("Path=/")
        # the old /api-scoped cookie is removed in the same response
        assert any("Path=/api" in h and "Expires=Thu, 01 Jan 1970" in h for h in res.headers.getlist("Set-Cookie"))

        client.delete_cookie(SESSION_COOKIE_NAME, path="/")
        login = client.post(
            "/api/v1/auth/login", json={"username_or_email": "cookieuser", "password": PASSWORD}
        )
        assert login.status_code == 200
        assert any(h.startswith(SESSION_COOKIE_NAME) for h in login.headers.getlist("Set-Cookie"))

    def test_me_upgrades_a_legacy_api_scoped_cookie_without_extending_it(self, client: FlaskClient) -> None:
        from app.core.security import generate_token

        user, token = _make_admin()
        client.set_cookie(SESSION_COOKIE_NAME, token, path="/api")
        res = client.get("/api/v1/auth/me")
        assert res.get_json()["authenticated"] is True
        cookies = res.headers.getlist("Set-Cookie")
        fresh = next(h for h in cookies if h.startswith(f"{SESSION_COOKIE_NAME}={token}"))
        assert "Path=/" in fresh and "HttpOnly" in fresh
        max_age = int(next(p.split("=")[1] for p in fresh.split("; ") if p.startswith("Max-Age")))
        assert 0 < max_age <= 24 * 3600

    def test_cookie_authenticates_without_authorization_header(self, client: FlaskClient) -> None:
        _register(client, "cookieme")
        me = client.get("/api/v1/auth/me").get_json()
        assert me["authenticated"] is True
        assert me["user"]["username"] == "cookieme"

    def test_logout_clears_the_cookie(self, client: FlaskClient) -> None:
        _register(client, "bye")
        res = client.post("/api/v1/auth/logout")
        assert any(
            h.startswith(f"{SESSION_COOKIE_NAME}=;") or "Max-Age=0" in h or "Expires=Thu, 01 Jan 1970" in h
            for h in res.headers.getlist("Set-Cookie")
        )
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is False

    def test_cross_site_write_with_cookie_is_blocked(self, client: FlaskClient) -> None:
        _register(client, "victim")
        blocked = client.put(
            "/api/v1/auth/profile",
            json={"email": "evil@example.com"},
            headers={"Origin": "https://evil.example"},
        )
        assert blocked.status_code == 403
        allowed = client.put(
            "/api/v1/auth/profile",
            json={"email": "victim2@example.com"},
            headers={"Origin": "http://localhost"},
        )
        assert allowed.status_code != 403

    def test_bearer_requests_are_not_blocked_by_origin_guard(self, client: FlaskClient, app: Flask) -> None:
        token = _register(client, "apiclient").get_json()["token"]
        res = client.put(
            "/api/v1/auth/profile",
            json={"email": "apiclient2@example.com"},
            headers={"Authorization": f"Bearer {token}", "Origin": "https://evil.example"},
        )
        assert res.status_code != 403


@pytest.mark.unit
class TestAdminSettings:
    def test_requires_admin(self, client: FlaskClient) -> None:
        token = _register(client, "plain").get_json()["token"]
        res = client.get("/api/v1/admin/settings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403

    def test_update_reset_and_privacy_info(self, client: FlaskClient) -> None:
        _, token = _make_admin()
        headers = {"Authorization": f"Bearer {token}"}

        rows = client.get("/api/v1/admin/settings", headers=headers).get_json()["settings"]
        by_key = {r["key"]: r for r in rows}
        assert by_key["session_hours"]["overridden"] is False

        res = client.put(
            "/api/v1/admin/settings",
            headers=headers,
            json={"settings": {"contact_email": "privacy@example.com", "session_hours": 48, "reset_token_minutes": 30}},
        )
        assert res.status_code == 200

        info = client.get("/api/v1/privacy-info").get_json()
        assert info["contactEmail"] == "privacy@example.com"
        assert info["sessionSeconds"] == 48 * 3600
        assert info["resetSeconds"] == 30 * 60

        # a new token really uses the configured session length
        payload = jwt.decode(generate_token(1), options={"verify_signature": False})
        assert payload["exp"] - payload["iat"] == 48 * 3600

        res = client.put("/api/v1/admin/settings", headers=headers, json={"settings": {"session_hours": None}})
        assert res.status_code == 200
        info = client.get("/api/v1/privacy-info").get_json()
        assert info["sessionSeconds"] == 24 * 3600

    def test_rejects_invalid_values_without_partial_writes(self, client: FlaskClient) -> None:
        _, token = _make_admin("boss2")
        headers = {"Authorization": f"Bearer {token}"}
        res = client.put(
            "/api/v1/admin/settings",
            headers=headers,
            json={"settings": {"session_hours": 9999, "contact_email": "ok@example.com"}},
        )
        assert res.status_code == 400
        rows = client.get("/api/v1/admin/settings", headers=headers).get_json()["settings"]
        assert all(not r["overridden"] for r in rows)

    def test_privacy_info_is_public(self, client: FlaskClient) -> None:
        res = client.get("/api/v1/privacy-info")
        assert res.status_code == 200
        assert set(res.get_json()) == {
            "contactEmail",
            "mailProvider",
            "verificationSeconds",
            "resetSeconds",
            "sessionSeconds",
            "streakPruneSeconds",
        }


@pytest.mark.unit
class TestDeleteOwnAccount:
    def test_wrong_password_is_rejected(self, client: FlaskClient) -> None:
        _register(client, "keeper")
        res = client.delete("/api/v1/auth/account", json={"password": "nope-nope"})
        assert res.status_code == 403
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is True

    def test_requires_login(self, app: Flask) -> None:
        assert app.test_client().delete("/api/v1/auth/account", json={"password": PASSWORD}).status_code == 401

    def test_deletes_account_and_anonymizes_bug_reports(self, client: FlaskClient) -> None:
        data = _register(client, "leaver").get_json()
        user_id = data["user"]["id"]
        db.session.add(
            BugReport(
                user_id=user_id,
                reporter_name="leaver",
                reporter_email="leaver@example.com",
                title="t",
                message="m",
            )
        )
        db.session.commit()

        res = client.delete("/api/v1/auth/account", json={"password": PASSWORD})
        assert res.status_code == 200
        db.session.expire_all()
        assert db.session.get(User, user_id) is None
        report = db.session.query(BugReport).one()
        assert report.reporter_name == "Deleted user"
        assert report.reporter_email is None
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is False

    def test_last_admin_cannot_delete_itself(self, client: FlaskClient) -> None:
        _, token = _make_admin("soleadmin")
        res = client.delete(
            "/api/v1/auth/account",
            json={"password": PASSWORD},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400


class TestExportOwnData:
    def test_requires_login(self, client: FlaskClient) -> None:
        assert client.get("/api/v1/auth/account/export").status_code == 401

    def test_exports_own_records_without_secrets(self, client: FlaskClient) -> None:
        data = _register(client, "exporter").get_json()
        user_id = data["user"]["id"]
        db.session.add(
            BugReport(user_id=user_id, reporter_name="exporter", title="t", message="m")
        )
        db.session.commit()

        res = client.get("/api/v1/auth/account/export")
        assert res.status_code == 200
        assert "attachment" in res.headers["Content-Disposition"]
        body = res.get_json()
        assert body["account"]["username"] == "exporter"
        assert "password_hash" not in body["account"]
        assert "reset_token" not in body["account"]
        assert "verification_code" not in body["account"]
        assert [r["title"] for r in body["bug_reports"]] == ["t"]
        assert body["streak_runs"]["chaos"] == {"runs": [], "match_log": []}
