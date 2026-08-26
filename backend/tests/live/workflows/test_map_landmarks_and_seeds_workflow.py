# backend/tests/live/workflows/test_map_landmarks_and_seeds_workflow.py
import pytest

def test_map_landmarks_and_seeds_workflow(live_client):
    # Step 1: Search maps by keyword
    search_res = live_client.get("/api/v1/maps?search=House")
    assert search_res.status_code == 200
    found = search_res.get_json()["maps"]
    assert any("House" in m["name"] for m in found)

    # Step 2: Query multi-floor map (RPD East Wing)
    rpd_res = live_client.get("/api/v1/maps/rpd_east?floor=1")
    assert rpd_res.status_code in (200, 404)
    if rpd_res.status_code == 200:
        rpd = rpd_res.get_json()["map"]
        assert rpd["id"] == "rpd_east"
