# backend/tests/live/api/test_live_streaks_api.py
import pytest


@pytest.mark.live
def test_live_page_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("streak_user_1", "str1@example.com", "pass123")
    
    res_roster = client.get("/api/v1/page-streak/roster", headers=headers)
    assert res_roster.status_code == 200
    roster_data = res_roster.get_json()["data"]
    assert len(roster_data) > 0

    res_pool = client.get("/api/v1/page-streak/pool", headers=headers)
    assert res_pool.status_code == 200
    assert res_pool.get_json()["pool_size"] > 0


@pytest.mark.live
def test_live_gauntlet_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gauntlet_user_1", "gaunt1@example.com", "pass123")
    
    res = client.get("/api/v1/gauntlet-streak/run?role=killer", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["role"] == "killer"


@pytest.mark.live
def test_live_chaos_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("chaos_user_1", "chaos1@example.com", "pass123")
    
    res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["difficulty"] == "easy"


@pytest.mark.live
def test_live_history_streak_flow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("hist_user_1", "hist1@example.com", "pass123")
    
    res = client.get("/api/v1/history-streak/run?mode=medium", headers=headers)
    assert res.status_code == 200
    run_data = res.get_json()["run"]
    assert run_data["mode"] == "medium"
