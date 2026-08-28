# backend/tests/live/workflows/test_admin_killswitch_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminKillswitchWorkflow:
    """Workflow testing dynamic challenge mode killswitch deactivation and reactivation."""

    def test_full_admin_killswitch_audit_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, user_headers, user = auth_client_factory("player_wf", "player@example.com", "pass123")

        modes_res = admin_client.get("/api/v1/admin/challenge-modes")
        assert modes_res.status_code == 200
        modes = modes_res.get_json()["modes"]
        assert any(m["mode"] == "chaos" for m in modes)

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": False, "reason": "Emergency Maintenance"},
        )
        assert dis_res.status_code == 200

        blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": True},
        )
        assert en_res.status_code == 200

        ok_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
        assert ok_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "challenge_mode_disabled" in actions
        assert "challenge_mode_enabled" in actions
