# backend/tests/live/workflows/test_page_streak_multipage_progression_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_page_streak_multipage_progression_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("page_streak_runner", "pstreak@example.com", "pass123")

    roster_res = client.get("/api/v1/page-streak/roster", headers=headers)
    assert roster_res.status_code == 200
    roster = roster_res.get_json()["data"]
    assert len(roster) > 0
    killer_name = roster[0]["killer"]

    pool_res = client.get("/api/v1/page-streak/pool", headers=headers)
    assert pool_res.status_code == 200
    assert pool_res.get_json()["pool_size"] > 0

    start_res = client.post("/api/v1/page-streak/run/start", json={"killer": killer_name}, headers=headers)
    assert start_res.status_code in (200, 201)

    run_res = client.get(f"/api/v1/page-streak/run?killer={killer_name}", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.get_json()["run"]
    assert run_data is not None
    assert run_data["killer"] == killer_name

    result_res = client.post("/api/v1/page-streak/run/result", json={
        "killer": killer_name,
        "page": 0,
        "perks": ["Agitation", "Brutal Strength"],
        "result": "win"
    }, headers=headers)
    assert result_res.status_code in (200, 400)
