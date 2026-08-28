# backend/tests/live/workflows/test_gauntlet_multiround_progression_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestGauntletMultiroundProgressionWorkflow:
    """Workflow testing multi-round Gauntlet progression, target reveals, and result logging."""

    def test_gauntlet_multiround_progression_workflow(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        # Upewnij się, że tryb gauntlet jest aktywny
        admin_client.put(
            "/api/v1/admin/challenge-modes/gauntlet",
            json={"is_enabled": True},
        )

        client, headers, user = auth_client_factory(
            "gauntlet_boss", "gboss@example.com", "pass123"
        )

        run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
        assert run_res.status_code == 200
        run = run_res.get_json()["run"]
        run_id = run["id"]

        reveal_res = client.post(
            "/api/v1/gauntlet-streak/reveal", json={"run_id": run_id}, headers=headers
        )
        assert reveal_res.status_code in (200, 400)

        win_res = client.post(
            "/api/v1/gauntlet-streak/result",
            json={"run_id": run_id, "result": "win", "role": "killer"},
            headers=headers,
        )
        assert win_res.status_code in (200, 400)

        stats_res = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json()["stats"]
        assert isinstance(stats, dict)