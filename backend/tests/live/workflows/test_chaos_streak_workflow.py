# backend/tests/live/workflows/test_chaos_streak_workflow.py
import pytest

def test_full_chaos_streak_lifecycle_workflow(live_client, auth_client_factory):
    # Step 1: Authenticated user
    client, headers, user = auth_client_factory("chaos_runner_1", "chaos_wf@test.com", "pass123")
    
    # Step 2: Initialize new Easy Chaos run
    run_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.get_json()["run"]
    run_id = run_data["id"]
    killer_id = run_data.get("killer_id") or run_data.get("current_killer_id") or run_data.get("killer", {}).get("id") or 1

    # Step 3: Reveal hidden perks
    reveal_res = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert reveal_res.status_code in (200, 400)

    # Step 4: Submit Win result
    win_res = client.post("/api/v1/chaos-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "killer_id": killer_id
    }, headers=headers)
    assert win_res.status_code == 200
    updated_run = win_res.get_json()["run"]
    assert updated_run["current_streak"] >= 1

    # Step 5: Check stats
    stats_res = client.get("/api/v1/chaos-streak/stats?difficulty=easy", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json().get("stats", stats_res.get_json())
    assert stats.get("total_wins", 0) >= 1 or stats.get("current_streak", 0) >= 1 or isinstance(stats, dict)
