# backend/tests/live/workflows/test_jwt_security_and_session_validation_workflow.py
from typing import Any, Callable
import pytest
from flask import Flask
from flask.testing import FlaskClient
from app.core.security import decode_token


@pytest.mark.live
@pytest.mark.workflow
class TestJWTSecurityAndSessionValidationWorkflow:
    """Workflow verifying cryptographic token validation, signature tampering, and header formatting."""

    def test_jwt_security_and_session_validation_workflow(
        self,
        live_app: Flask,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "jwt_sec_user", "jwtsec@example.com", "pass123"
        )
        valid_token = headers["Authorization"].split(" ")[1]

        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.get_json()["authenticated"] is True

        tampered_token = valid_token[:-5] + "XXXXX"
        bad_sig_res = live_client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert bad_sig_res.status_code == 200
        assert bad_sig_res.get_json()["authenticated"] is False

        malformed_res = live_client.get(
            "/api/v1/auth/me", headers={"Authorization": "MalformedHeaderWithNoBearer"}
        )
        assert malformed_res.status_code == 200
        assert malformed_res.get_json()["authenticated"] is False

        with live_app.app_context():
            decoded = decode_token(valid_token)
            assert decoded is not None
            assert str(decoded["sub"]) == str(user["id"])
            assert decode_token("invalid.token.here") is None
