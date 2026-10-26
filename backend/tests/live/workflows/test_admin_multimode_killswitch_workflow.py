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

        # The public list the frontend reads shows the switch and its reason at once.
        public = {m["mode"]: m for m in live_client.get("/api/v1/challenge-modes").get_json()["modes"]}
        assert set(public) == {"gauntlet", "chaos", "history", "page_streak"}
        assert public["chaos"]["is_enabled"] is False
        assert public["chaos"]["disabled_reason"] == "Temporary Chaos Maintenance"

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/chaos", json={"is_enabled": True}
        )
        assert en_res.status_code == 200

        unblocked = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert unblocked.status_code == 200
        public = {m["mode"]: m for m in live_client.get("/api/v1/challenge-modes").get_json()["modes"]}
        assert public["chaos"]["is_enabled"] is True

    def test_disabled_history_mode_blocks_hell_runs_too(
        self,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, _ = auth_client_factory("killswitch_history_user", "kshist@example.com", "pass123")
        try:
            assert admin_client.put(
                "/api/v1/admin/challenge-modes/history",
                json={"is_enabled": False, "reason": "History maintenance"},
            ).status_code == 200
            blocked = client.get("/api/v1/history-streak/run?mode=hell", headers=headers)
            assert blocked.status_code == 400
            assert "disabled" in blocked.get_json()["error"].lower()
        finally:
            assert admin_client.put(
                "/api/v1/admin/challenge-modes/history", json={"is_enabled": True}
            ).status_code == 200
        assert client.get("/api/v1/history-streak/run?mode=hell", headers=headers).status_code == 200
