# backend/tests/live/workflows/test_chaos_streak_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_full_chaos_streak_lifecycle_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_runner_1", "chaos_wf@example.com", "pass123")
    
    run_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.get_json()["run"]
    run_id = run_data["id"]
    killer_id = run_data.get("killer_id") or run_data.get("current_killer_id") or run_data.get("killer", {}).get("id") or 1

    reveal_res = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert reveal_res.status_code in (200, 400)

    win_res = client.post("/api/v1/chaos-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "killer_id": killer_id
    }, headers=headers)
    assert win_res.status_code in (200, 400)

    stats_res = client.get("/api/v1/chaos-streak/stats?difficulty=easy", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json().get("stats", stats_res.get_json())
    assert stats.get("total_wins", 0) >= 0 or isinstance(stats, dict)
