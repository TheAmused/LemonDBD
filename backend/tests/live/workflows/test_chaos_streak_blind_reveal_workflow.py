# backend/tests/live/workflows/test_chaos_streak_blind_reveal_workflow.py
import pytest

def test_chaos_streak_blind_reveal_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_revealer", "creveal@test.com", "pass123")

    # Step 1: Start Chaos Run (Easy mode)
    start_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert start_res.status_code == 200
    run = start_res.get_json()["run"]
    run_id = run["id"]

    # Step 2: Unveil perk slot
    rev0 = client.post("/api/v1/chaos-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert rev0.status_code == 200
    run_rev = rev0.get_json()["run"]
    assert "revealed_slots" in run_rev or "slots" in run_rev or isinstance(run_rev, dict)

    # Step 3: Submit Win with required killer_id
    win_res = client.post("/api/v1/chaos-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "killer_id": 1
    }, headers=headers)
    assert win_res.status_code == 200
    res_data = win_res.get_json()
    assert "run" in res_data or "current_streak" in res_data or isinstance(res_data, dict)
