# backend/tests/live/workflows/test_chaos_streak_workflow.py
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestChaosStreakWorkflow:
    """A Chaos run's win and loss reach the per-difficulty statistics."""

    def test_full_chaos_streak_lifecycle_workflow(
        self,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, _ = auth_client_factory("chaos_runner_1", "chaos_wf@example.com", "pass123")

        def stats(difficulty: str) -> dict[str, Any]:
            res = client.get(f"/api/v1/chaos-streak/stats?difficulty={difficulty}", headers=headers)
            assert res.status_code == 200
            return res.get_json()["stats"]

        assert (stats("easy")["total_matches"], stats("easy")["recent_logs"]) == (0, [])

        run = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers).get_json()["run"]
        first, second = run["owned_killers"][:2]
        for killer, result in ((first, "win"), (second, "loss")):
            res = client.post("/api/v1/chaos-streak/result", json={"run_id": run["id"], "result": result, "killer_id": killer}, headers=headers)
            assert res.status_code == 200, res.get_json()

        easy = stats("easy")
        assert (easy["total_matches"], easy["wins"], easy["losses"], easy["win_rate"]) == (2, 1, 1, 50.0)
        assert [log["killer_id"] for log in easy["recent_logs"]] == [second, first]
        assert stats("hell")["total_matches"] == 0, "statistics are kept per difficulty"
        assert client.get("/api/v1/chaos-streak/stats", headers=headers).status_code == 400, "the difficulty is required"
