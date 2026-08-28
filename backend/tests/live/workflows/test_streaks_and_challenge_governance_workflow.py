# backend/tests/live/workflows/test_streaks_and_challenge_governance_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestStreaksAndChallengeGovernanceWorkflow:
    """Workflow asserting multi-mode streak access restrictions under active administrative governance."""

    def test_full_streaks_and_challenge_governance(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "challenge_master", "cmaster@example.com", "pass123"
        )

        roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
        assert roster_res.status_code == 200
        roster = roster_res.get_json()["data"]
        assert len(roster) > 0
        test_killer = roster[0]["killer"] if isinstance(roster[0], dict) else str(roster[0])

        run_res = client.get(f"/api/v1/page-streak/run?killer={test_killer}", headers=headers)
        assert run_res.status_code == 200

        gauntlet_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert gauntlet_res.status_code == 200
        g_run = gauntlet_res.get_json()["run"]
        g_run_id = g_run["id"]

        g_win_res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"run_id": g_run_id, "result": "win", "role": "killer"},
            headers=headers,
        )
        assert g_win_res.status_code in (200, 400)

        hist_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
        assert hist_res.status_code == 200

        dis_res = admin_client.put(
            "/api/v1/admin/challenge-modes/gauntlet",
            json={"is_enabled": False, "reason": "Gauntlet maintenance"},
        )
        assert dis_res.status_code == 200

        client_new, headers_new, user_new = auth_client_factory(
            "blocked_runner", "block@example.com", "pass123"
        )
        blocked_res = client_new.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=headers_new
        )
        assert blocked_res.status_code == 400
        assert "disabled" in blocked_res.get_json()["error"].lower()

        en_res = admin_client.put(
            "/api/v1/admin/challenge-modes/gauntlet", json={"is_enabled": True}
        )
        assert en_res.status_code == 200

        unblocked_res = client_new.get(
            "/api/v1/gauntlet-streak/run?role=killer", headers=headers_new
        )
        assert unblocked_res.status_code == 200
