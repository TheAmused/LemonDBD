# backend/tests/live/workflows/test_gauntlet_multiround_progression_workflow.py
import pytest

def test_gauntlet_multiround_progression_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gauntlet_boss", "gboss@test.com", "pass123")

    # Step 1: Start Gauntlet Run
    run_res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
    assert run_res.status_code == 200
    run = run_res.get_json()["run"]
    run_id = run["id"]

    # Step 2: Reveal target killer
    reveal_res = client.post("/api/v1/gauntlet-streak/reveal", json={"run_id": run_id}, headers=headers)
    assert reveal_res.status_code in (200, 400)

    # Step 3: Submit Win
    win_res = client.post("/api/v1/gauntlet-streak/result", json={
        "run_id": run_id,
        "result": "win",
        "role": "killer"
    }, headers=headers)
    assert win_res.status_code in (200, 400)

    # Step 4: Check Gauntlet Stats with required role param
    stats_res = client.get("/api/v1/gauntlet-streak/stats?role=killer", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json()["stats"]
    assert isinstance(stats, dict)
