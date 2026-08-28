# backend/tests/live/workflows/test_admin_multimode_killswitch_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminMultimodeKillswitchWorkflow:
    """Workflow asserting multi-mode killswitch gating across various challenge streaks."""

    def test_admin_multimode_killswitch_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory("killswitch_user", "ksuser@example.com", "pass123")

        modes_res = admin_client.get("/api/v1/admin/challenge-modes")
        assert modes_res.status_code == 200
        modes = modes_res.get_json()["modes"]
        mode_names = [m["mode"] for m in modes]
        assert "chaos" in mode_names

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos",
            json={"is_enabled": False, "reason": "Temporary Chaos Maintenance"},
        )
        assert dis_res.status_code == 200

        blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos", json={"is_enabled": True}
        )
        assert en_res.status_code == 200

        unblocked = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert unblocked.status_code == 200
