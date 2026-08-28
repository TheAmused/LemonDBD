# backend/tests/unit/test_security_and_auth.py
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
import pytest
from flask import Flask, g, jsonify, request
from app.core.security import (
    DEFAULT_JWT_ALGORITHM,
    DEFAULT_SECRET_KEY,
    admin_required,
    decode_token,
    generate_token,
    get_current_user,
    hash_password,
    login_required,
    verify_password,
)
from app.models.user import User


@pytest.mark.unit
class TestPasswordHashing:
    def test_hash_and_verify_success(self) -> None:
        raw = "UltraSecureDbD#2026!"
        pwd_hash = hash_password(raw)
        assert pwd_hash != raw
        assert verify_password(raw, pwd_hash) is True

    def test_verify_failure_wrong_password(self) -> None:
        raw = "CorrectPassword123"
        pwd_hash = hash_password(raw)
        assert verify_password("WrongPassword123", pwd_hash) is False

    def test_verify_empty_inputs(self) -> None:
        assert verify_password("", "some_hash") is False
        assert verify_password("some_pass", "") is False
        assert verify_password("", "") is False


@pytest.mark.unit
class TestJWTGenerationAndDecode:
    def test_generate_and_decode_token_in_app_context(self, app: Flask) -> None:
        with app.app_context():
            token = generate_token(user_id=42, role="admin", extra_claims={"env": "unit_test"})
            payload = decode_token(token)

            assert payload is not None
            assert payload["sub"] == "42"
            assert payload["role"] == "admin"
            assert payload["env"] == "unit_test"
            assert "exp" in payload
            assert "iat" in payload

    def test_generate_and_decode_token_standalone_fallback(self) -> None:
        token = generate_token(user_id=101, role="user")
        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "101"
        assert payload["role"] == "user"

    def test_decode_token_expired(self) -> None:
        now = datetime.now(timezone.utc)
        expired_payload = {
            "sub": "99",
            "role": "user",
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        }
        expired_token = jwt.encode(expired_payload, DEFAULT_SECRET_KEY, algorithm=DEFAULT_JWT_ALGORITHM)
        assert decode_token(expired_token) is None

    def test_decode_token_invalid_signature(self) -> None:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": "99",
            "role": "user",
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        tampered_token = jwt.encode(payload, "wrong-secret-key-1234567890!", algorithm=DEFAULT_JWT_ALGORITHM)
        assert decode_token(tampered_token) is None

    def test_decode_empty_or_malformed_token(self) -> None:
        assert decode_token("") is None
        assert decode_token("not.a.valid.jwt") is None


@pytest.mark.unit
class TestAuthDecoratorsAndUserExtraction:
    @pytest.fixture
    def test_flask_app(self) -> Flask:
        test_app = Flask(__name__)
        test_app.config["SECRET_KEY"] = "unit-test-secret-key-0123456789!"
        test_app.config["JWT_SECRET_KEY"] = "unit-test-secret-key-0123456789!"
        test_app.config["TESTING"] = True

        @test_app.route("/api/protected", methods=["GET"])
        @login_required
        def protected_route():
            return jsonify({"user_id": g.current_user.id, "role": g.current_user.role}), 200

        @test_app.route("/api/admin-only", methods=["GET"])
        @admin_required
        def admin_route():
            return jsonify({"admin_user_id": g.current_user.id, "status": "authorized"}), 200

        return test_app

    def test_login_required_unauthorized_missing_token(self, test_flask_app: Flask) -> None:
        client = test_flask_app.test_client()
        response = client.get("/api/protected")
        assert response.status_code == 401
        data = response.get_json()
        assert data["error"] == "Authentication required"

    def test_login_required_success_via_bearer(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        mock_user = User(
            id=7,
            username="dwight_fairfield",
            email="dwight@dbd.local",
            password_hash=hash_password("test"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=7, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: mock_user if pk == 7 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["user_id"] == 7
        assert data["role"] == "user"

    def test_login_required_success_via_query_token(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        mock_user = User(
            id=12,
            username="meg_thomas",
            email="meg@dbd.local",
            password_hash=hash_password("sprintburst"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=12, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: mock_user if pk == 12 else None)

        client = test_flask_app.test_client()
        response = client.get(f"/api/protected?token={token}")
        assert response.status_code == 200
        data = response.get_json()
        assert data["user_id"] == 12

    def test_admin_required_forbidden_for_standard_user(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        standard_user = User(
            id=15,
            username="claudette_morel",
            email="claudette@dbd.local",
            password_hash=hash_password("botany"),
            role="user",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=15, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: standard_user if pk == 15 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"] == "Admin access required"

    def test_admin_required_success_for_admin_role(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        admin_user = User(
            id=1,
            username="the_entity_admin",
            email="entity@dbd.local",
            password_hash=hash_password("masterkey"),
            role="admin",
            is_active=True,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=1, role="admin")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: admin_user if pk == 1 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.get_json()
        assert data["admin_user_id"] == 1
        assert data["status"] == "authorized"

    def test_inactive_user_rejected(self, test_flask_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        inactive_user = User(
            id=88,
            username="banned_player",
            email="banned@dbd.local",
            password_hash=hash_password("bannedpass"),
            role="user",
            is_active=False,
        )

        with test_flask_app.app_context():
            token = generate_token(user_id=88, role="user")

        from app.core import security
        monkeypatch.setattr(security.db.session, "get", lambda model, pk: inactive_user if pk == 88 else None)

        client = test_flask_app.test_client()
        response = client.get("/api/protected", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
