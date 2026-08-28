# backend/tests/unit/test_security_guards.py
import pytest
from app.core.limiter import get_client_ip, validate_honeypot
from app.services.altcha_service import AltchaService


@pytest.mark.unit
def test_validate_honeypot_clean_data():
    assert validate_honeypot({}) is True
    assert validate_honeypot({"username": "entity", "email": "entity@lemondbd.com"}) is True
    assert validate_honeypot({"website_trap": "", "honeypot_verification": None, "company_fax": "  "}) is True
    assert validate_honeypot({"website_trap": False, "honeypot_verification": None}) is True
    assert validate_honeypot(None) is True


@pytest.mark.unit
def test_validate_honeypot_trapped_data():
    assert validate_honeypot({"website_trap": "http://spam.org"}) is False
    assert validate_honeypot({"honeypot_verification": "bot_value"}) is False
    assert validate_honeypot({"company_fax": "555-0199"}) is False
    assert validate_honeypot({"website_trap": True}) is False
    assert validate_honeypot({"honeypot_verification": True}) is False
    assert validate_honeypot({"company_fax": True}) is False
    assert validate_honeypot({"custom_trap": "spam"}, field_names=("custom_trap",)) is False
    assert validate_honeypot({"custom_trap": True}, field_names=("custom_trap",)) is False


@pytest.mark.unit
def test_get_client_ip(app):
    with app.test_request_context("/", headers={
        "X-Real-IP": "198.51.100.99",
        "X-Forwarded-For": "203.0.113.195, 70.41.3.18"
    }):
        ip = get_client_ip()
        assert ip == "198.51.100.99"

    with app.test_request_context("/", headers={"X-Real-IP": "  198.51.100.50  "}):
        ip = get_client_ip()
        assert ip == "198.51.100.50"

    with app.test_request_context("/", headers={"X-Forwarded-For": "203.0.113.195, 70.41.3.18"}):
        ip = get_client_ip()
        assert ip == "203.0.113.195"

    with app.test_request_context("/", headers={"X-Forwarded-For": "   198.51.100.1  , 10.0.0.1"}):
        ip = get_client_ip()
        assert ip == "198.51.100.1"

    with app.test_request_context("/"):
        ip = get_client_ip()
        assert ip in ("127.0.0.1", "localhost", None) or isinstance(ip, str)


@pytest.mark.unit
def test_register_honeypot_rejection_string(client):
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


@pytest.mark.unit
def test_register_honeypot_rejection_boolean(client):
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


@pytest.mark.unit
def test_bug_report_honeypot_rejection(client):
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


@pytest.mark.unit
def test_altcha_challenge_cache_control_headers(client):
    response = client.get("/api/v1/auth/altcha-challenge")
    assert response.status_code == 200
    cache_control = response.headers.get("Cache-Control", "")
    assert "no-store" in cache_control
    assert "no-cache" in cache_control
    assert "must-revalidate" in cache_control


@pytest.mark.unit
def test_rate_limit_429_format():
    from app import create_app
    from app.core.config import TestingConfig

    class RateLimitConfig(TestingConfig):
        RATELIMIT_ENABLED = True

    rate_app = create_app(RateLimitConfig)
    rate_client = rate_app.test_client()

    ip_headers = {"X-Real-IP": "192.0.2.42"}
    for i in range(5):
        rate_client.post("/api/v1/auth/forgot-password", json={"email": f"test{i}@test.com"}, headers=ip_headers)

    resp = rate_client.post("/api/v1/auth/forgot-password", json={"email": "test6@test.com"}, headers=ip_headers)
    assert resp.status_code == 429
    data = resp.get_json()
    assert data["error"] == "Too Many Requests"
    assert data["message"] == "Rate limit exceeded. Please wait a moment before trying again."
    assert "retry_after" in data


@pytest.mark.unit
def test_altcha_service_max_number_validation():
    secret_key = "test-secret-key"
    with pytest.raises(ValueError, match="max_number must be positive"):
        AltchaService.create_challenge(secret_key, max_number=0)

    with pytest.raises(ValueError, match="max_number must be positive"):
        AltchaService.create_challenge(secret_key, max_number=-10)


@pytest.mark.unit
def test_altcha_service_verify_missing_maxnumber():
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
