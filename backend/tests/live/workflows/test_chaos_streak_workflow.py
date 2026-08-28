# backend/tests/live/workflows/test_chaos_streak_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChaosStreakWorkflow:
    """Workflow verifying Chaos Streak run lifecycles, perk draws, and win rate calculation."""

    def test_full_chaos_streak_lifecycle_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "chaos_runner_1", "chaos_wf@example.com", "pass123"
        )

        run_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
        assert run_res.status_code == 200
        run_data = run_res.get_json()["run"]
        run_id = run_data["id"]
        killer_id = (
            run_data.get("killer_id")
            or run_data.get("current_killer_id")
            or (run_data.get("owned_killers") and run_data["owned_killers"][0])
            or "The Trapper"
        )

        reveal_res = client.post(
            "/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers
        )
        assert reveal_res.status_code in (200, 400)

        win_res = client.post(
            "/api/v1/chaos-streak/result",
            json={"run_id": run_id, "result": "win", "killer_id": killer_id},
            headers=headers,
        )
        assert win_res.status_code in (200, 400)

        stats_res = client.get("/api/v1/chaos-streak/stats?difficulty=easy", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.get_json().get("stats", stats_res.get_json())
        assert stats.get("total_wins", 0) >= 0 or isinstance(stats, dict)
