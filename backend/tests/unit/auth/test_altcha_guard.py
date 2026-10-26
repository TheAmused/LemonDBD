# backend/tests/unit/auth/test_altcha_guard.py
"""The ALTCHA proof-of-work the web client solves must be checked by the server, once per solution."""
import hashlib
from collections.abc import Iterator
from typing import Any

import pytest
from flask.testing import FlaskClient

from app.services.altcha_service import AltchaService


def _solved_payload(secret: str) -> dict[str, Any]:
    challenge = AltchaService.create_challenge(secret, max_number=300)
    number = next(
        n for n in range(challenge["maxnumber"] + 1)
        if hashlib.sha256(f"{challenge['salt']}{n}".encode("utf-8")).hexdigest() == challenge["challenge"]
    )
    return {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }


@pytest.fixture
def enforced(client: FlaskClient) -> Iterator[FlaskClient]:
    app = client.application
    previous = app.config.get("ALTCHA_ENFORCED")
    app.config["ALTCHA_ENFORCED"] = True
    try:
        yield client
    finally:
        app.config["ALTCHA_ENFORCED"] = previous


@pytest.mark.unit
class TestAltchaGuard:
    @pytest.mark.parametrize(
        "path",
        ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/forgot-password"],
    )
    def test_auth_routes_reject_a_missing_solution(self, enforced: FlaskClient, path: str) -> None:
        response = enforced.post(path, json={"username_or_email": "a@b.co", "password": "x", "email": "a@b.co"})
        assert response.status_code == 400
        assert response.get_json()["error_code"] == "altcha_failed"

    def test_guest_bug_report_needs_a_solution(self, enforced: FlaskClient) -> None:
        response = enforced.post(
            "/api/v1/bug-reports",
            json={"title": "t", "message": "m", "reporter_email": "guest@example.com"},
        )
        assert response.status_code == 400
        assert response.get_json()["error_code"] == "altcha_failed"

    def test_tampered_solution_is_rejected(self, enforced: FlaskClient) -> None:
        payload = _solved_payload(enforced.application.config["SECRET_KEY"])
        payload["number"] += 1
        response = enforced.post(
            "/api/v1/auth/login", json={"username_or_email": "nobody", "password": "x", "altcha": payload}
        )
        assert response.status_code == 400

    def test_valid_solution_passes_once_then_is_a_replay(self, enforced: FlaskClient) -> None:
        payload = _solved_payload(enforced.application.config["SECRET_KEY"])
        body = {"username_or_email": "nobody", "password": "x", "altcha": payload}

        first = enforced.post("/api/v1/auth/login", json=body)
        assert first.status_code == 401  # got past the guard; the credentials are what failed

        second = enforced.post("/api/v1/auth/login", json=body)
        assert second.status_code == 400
        assert second.get_json()["error_code"] == "altcha_failed"

    def test_not_enforced_in_the_test_config(self, client: FlaskClient) -> None:
        response = client.post("/api/v1/auth/login", json={"username_or_email": "nobody", "password": "x"})
        assert response.status_code == 401
