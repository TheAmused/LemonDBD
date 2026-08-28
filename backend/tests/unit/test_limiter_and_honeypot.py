# backend/tests/unit/test_limiter_and_honeypot.py
import pytest
from flask import Flask
from app.core.limiter import get_client_ip, validate_honeypot


@pytest.mark.unit
class TestClientIPExtraction:
    """Tests for secure client IP address resolution through proxy headers."""

    @pytest.fixture
    def app_with_ip_test_route(self) -> Flask:
        app = Flask(__name__)

        @app.route("/ip-probe")
        def ip_probe():
            return {"ip": get_client_ip()}

        return app

    def test_x_real_ip_precedence(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        headers = {
            "X-Real-IP": "203.0.113.195",
            "X-Forwarded-For": "198.51.100.1, 198.51.100.2",
        }
        res = client.get("/ip-probe", headers=headers)
        assert res.get_json()["ip"] == "203.0.113.195"

    def test_x_forwarded_for_fallback_first_hop(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        headers = {
            "X-Forwarded-For": "198.51.100.44, 10.0.0.1",
        }
        res = client.get("/ip-probe", headers=headers)
        assert res.get_json()["ip"] == "198.51.100.44"

    def test_fallback_to_remote_addr_when_no_proxy_headers(self, app_with_ip_test_route: Flask) -> None:
        client = app_with_ip_test_route.test_client()
        res = client.get("/ip-probe", environ_base={"REMOTE_ADDR": "127.0.0.1"})
        assert res.get_json()["ip"] == "127.0.0.1"


@pytest.mark.unit
class TestHoneypotValidation:
    """Tests for bot trapping honeypot field detectors on authentication endpoints."""

    def test_clean_payload_passes(self) -> None:
        payload = {
            "username": "trapper_main",
            "email": "trapper@example.com",
            "website_trap": "",
            "honeypot_verification": None,
            "company_fax": False,
        }
        assert validate_honeypot(payload) is True

    def test_honeypot_triggered_by_string(self) -> None:
        payload = {
            "username": "bot_user",
            "website_trap": "http://spamsite.example.com",
        }
        assert validate_honeypot(payload) is False

    def test_honeypot_triggered_by_boolean_true(self) -> None:
        payload = {
            "username": "bot_user",
            "honeypot_verification": True,
        }
        assert validate_honeypot(payload) is False

    def test_honeypot_triggered_by_non_empty_custom_field(self) -> None:
        payload = {"hidden_spam_catcher": "Filled By Bot"}
        assert validate_honeypot(payload, field_names=("hidden_spam_catcher",)) is False

    def test_non_dict_payload_passes_gracefully(self) -> None:
        assert validate_honeypot(None) is True
        assert validate_honeypot(["item1", "item2"]) is True
