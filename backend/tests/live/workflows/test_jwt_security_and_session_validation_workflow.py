# backend/tests/live/workflows/test_jwt_security_and_session_validation_workflow.py
import pytest
from app.core.security import decode_token


@pytest.mark.live
@pytest.mark.workflow
def test_jwt_security_and_session_validation_workflow(live_app, live_client, auth_client_factory):
    client, headers, user = auth_client_factory("jwt_sec_user", "jwtsec@example.com", "pass123")
    valid_token = headers["Authorization"].split(" ")[1]

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["authenticated"] is True

    tampered_token = valid_token[:-5] + "XXXXX"
    bad_sig_res = live_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert bad_sig_res.status_code == 200
    assert bad_sig_res.get_json()["authenticated"] is False

    malformed_res = live_client.get("/api/v1/auth/me", headers={"Authorization": "MalformedHeaderWithNoBearer"})
    assert malformed_res.status_code == 200
    assert malformed_res.get_json()["authenticated"] is False

    with live_app.app_context():
        decoded = decode_token(valid_token)
        assert decoded is not None
        assert str(decoded["sub"]) == str(user["id"])
        assert decode_token("invalid.token.here") is None
