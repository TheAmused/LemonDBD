# backend/tests/live/workflows/test_interactive_map_navigation_workflow.py
import pytest

def test_interactive_map_navigation_workflow(live_client):
    # Step 1: Query all maps
    maps_res = live_client.get("/api/v1/maps")
    assert maps_res.status_code == 200
    maps = maps_res.get_json()["maps"]
    assert len(maps) > 0

    # Step 2: Query by realm filter
    macmillan_res = live_client.get("/api/v1/maps?realm=The%20MacMillan%20Estate")
    assert macmillan_res.status_code == 200
    mac_maps = macmillan_res.get_json()["maps"]
    assert len(mac_maps) > 0

    # Step 3: Query detail for Coal Tower
    detail_res = live_client.get("/api/v1/maps/coal_tower?seed=seed_a")
    assert detail_res.status_code == 200
    map_data = detail_res.get_json()["map"]
    assert map_data["id"] == "coal_tower"
