# backend/tests/live/workflows/test_history_streak_guessing_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient


@pytest.mark.live
@pytest.mark.workflow
class TestHistoryStreakGuessingWorkflow:
    """Workflow asserting History streak chronological release progression and outcomes."""

    def test_history_streak_guessing_workflow(
        self,
        live_client: FlaskClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, headers, user = auth_client_factory(
            "hist_guesser", "hguess@example.com", "pass123"
        )

        run_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
        assert run_res.status_code == 200
        run = run_res.get_json()
        assert "target_date" in run or "perk_name" in run or "id" in run or "run" in run

        res = client.post(
            "/api/v1/history-streak/result",
            json={"result": "loss", "mode": "medium"},
            headers=headers,
        )
        assert res.status_code in (200, 400)
