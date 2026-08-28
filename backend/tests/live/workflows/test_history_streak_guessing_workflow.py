# backend/tests/live/workflows/test_history_streak_guessing_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_history_streak_guessing_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("hist_guesser", "hguess@example.com", "pass123")

    run_res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
    assert run_res.status_code == 200
    run = run_res.get_json()
    assert "target_date" in run or "perk_name" in run or "id" in run or "run" in run

    res = client.post("/api/v1/history-streak/result", json={
        "result": "loss",
        "mode": "medium"
    }, headers=headers)
    assert res.status_code in (200, 400)
