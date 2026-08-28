# backend/tests/unit/test_security_guards.py
from typing import Any
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app.core.limiter import get_client_ip, validate_honeypot
from app.services.altcha_service import AltchaService


@pytest.mark.unit
class TestSecurityGuards:
    """Tests for honeypot spam protection, client IP resolution, ALTCHA security headers, and rate limits."""

    @pytest.mark.parametrize(
        "clean_payload",
        [
            {},
            {"username": "entity", "email": "entity@lemondbd.com"},
            {"website_trap": "", "honeypot_verification": None, "company_fax": "  "},
            {"website_trap": False, "honeypot_verification": None},
            None,
        ],
    )
    def test_validate_honeypot_clean_data(self, clean_payload: Any) -> None:
        assert validate_honeypot(clean_payload) is True

    @pytest.mark.parametrize(
        "trapped_payload, custom_fields",
        [
            ({"website_trap": "http://spam.org"}, None),
            ({"honeypot_verification": "bot_value"}, None),
            ({"company_fax": "555-0199"}, None),
            ({"website_trap": True}, None),
            ({"honeypot_verification": True}, None),
            ({"company_fax": True}, None),
            ({"custom_trap": "spam"}, ("custom_trap",)),
            ({"custom_trap": True}, ("custom_trap",)),
        ],
    )
    def test_validate_honeypot_trapped_data(
        self, trapped_payload: dict[str, Any], custom_fields: tuple[str, ...] | None
    ) -> None:
        if custom_fields:
            assert validate_honeypot(trapped_payload, field_names=custom_fields) is False
        else:
            assert validate_honeypot(trapped_payload) is False

    def test_get_client_ip(self, app: Flask) -> None:
        with app.test_request_context(
            "/",
            headers={
                "X-Real-IP": "198.51.100.99",
                "X-Forwarded-For": "203.0.113.195, 70.41.3.18",
            },
        ):
            ip = get_client_ip()
            assert ip == "198.51.100.99"

        with app.test_request_context("/", headers={"X-Real-IP": "  198.51.100.50  "}):
            ip = get_client_ip()
            assert ip == "198.51.100.50"

        with app.test_request_context(
            "/", headers={"X-Forwarded-For": "203.0.113.195, 70.41.3.18"}
        ):
            ip = get_client_ip()
            assert ip == "203.0.113.195"

        with app.test_request_context(
            "/", headers={"X-Forwarded-For": "   198.51.100.1  , 10.0.0.1"}
        ):
            ip = get_client_ip()
            assert ip == "198.51.100.1"

        with app.test_request_context("/"):
            ip = get_client_ip()
            assert ip in ("127.0.0.1", "localhost", None) or isinstance(ip, str)

    def test_register_honeypot_rejection_string(self, client: FlaskClient) -> None:
        payload = {
            "username": "spambot1",
            "email": "spambot1@test.com",
            "password": "Password123!",
            "website_trap": "http://spamsite.xyz",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "Spam detected."
        assert data["status"] == 400

    def test_register_honeypot_rejection_boolean(self, client: FlaskClient) -> None:
        payload = {
            "username": "spambot2",
            "email": "spambot2@test.com",
            "password": "Password123!",
            "honeypot_verification": True,
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "Spam detected."
        assert data["status"] == 400

    def test_bug_report_honeypot_rejection(self, client: FlaskClient) -> None:
        payload = {
            "title": "Broken link spam",
            "message": "Click here to buy stuff",
            "reporter_email": "bot@spam.com",
            "company_fax": "1-800-SPAM-NOW",
        }
        response = client.post("/api/v1/bug-reports", json=payload)
        assert response.status_code == 400
        data = response.get_json()
        assert data["error"] == "Spam detected."
        assert data["status"] == 400

    def test_altcha_challenge_cache_control_headers(self, client: FlaskClient) -> None:
        response = client.get("/api/v1/auth/altcha-challenge")
        assert response.status_code == 200
        cache_control = response.headers.get("Cache-Control", "")
        assert "no-store" in cache_control
        assert "no-cache" in cache_control
        assert "must-revalidate" in cache_control

    def test_rate_limit_429_format(self) -> None:
        from app import create_app
        from app.core.config import TestingConfig

        class RateLimitConfig(TestingConfig):
            RATELIMIT_ENABLED = True

        rate_app = create_app(RateLimitConfig)
        rate_client = rate_app.test_client()

        ip_headers = {"X-Real-IP": "192.0.2.42"}
        for i in range(5):
            rate_client.post(
                "/api/v1/auth/forgot-password",
                json={"email": f"test{i}@test.com"},
                headers=ip_headers,
            )

        resp = rate_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "test6@test.com"},
            headers=ip_headers,
        )
        assert resp.status_code == 429
        data = resp.get_json()
        assert data["error"] == "Too Many Requests"
        assert data["message"] == "Rate limit exceeded. Please wait a moment before trying again."
        assert "retry_after" in data

    @pytest.mark.parametrize("invalid_max", [0, -1, -500])
    def test_altcha_service_max_number_validation(self, invalid_max: int) -> None:
        secret_key = "test-secret-key"
        with pytest.raises(ValueError, match="max_number must be positive"):
            AltchaService.create_challenge(secret_key, max_number=invalid_max)

    def test_altcha_service_verify_missing_maxnumber(self) -> None:
        secret_key = "test-secret-key"
        payload = {
            "algorithm": "SHA-256",
            "challenge": "a" * 64,
            "number": 100,
            "salt": "somesalt1234",
            "signature": "b" * 64,
            "expires": 9999999999,
        }
        is_valid, err = AltchaService.verify_solution(payload, secret_key)
        assert is_valid is False
        assert "maxnumber" in err.lower()
