# backend/tests/live/workflows/test_history_streak_guessing_workflow.py
from typing import Any, Callable

import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestHistoryStreakGuessingWorkflow:
    """A History run: a win completes a killer of the current row, a loss resets the streak but keeps the best."""

    def test_history_streak_guessing_workflow(
        self,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, _ = auth_client_factory("hist_guesser", "hguess@example.com", "pass123")

        run = client.get("/api/v1/history-streak/run?mode=medium", headers=headers).get_json()["run"]
        assert (run["mode"], run["status"], run["total_killers_beaten"], run["completed_killers"]) == ("medium", "in_progress", 0, [])
        first, second = run["current_row_killers"][:2]

        def report(result: str, killer: str) -> dict[str, Any]:
            res = client.post("/api/v1/history-streak/result", json={"run_id": run["id"], "result": result, "killer_id": killer}, headers=headers)
            assert res.status_code == 200, res.get_json()
            return res.get_json()["run"]

        won = report("win", first)
        assert (won["completed_killers"], won["total_killers_beaten"], won["best_killers_beaten"]) == ([first], 1, 1)

        lost = report("loss", second)
        assert (lost["completed_killers"], lost["total_killers_beaten"], lost["best_killers_beaten"]) == ([], 0, 1)
        assert (lost["total_wins"], lost["total_losses"], lost["attempt"]) == (1, 1, 2)

        # A result needs the run and the killer it was played with.
        missing = client.post("/api/v1/history-streak/result", json={"result": "loss", "mode": "medium"}, headers=headers)
        assert missing.status_code == 400
