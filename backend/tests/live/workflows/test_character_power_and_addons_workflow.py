# backend/tests/live/workflows/test_character_power_and_addons_workflow.py
import pytest

def test_character_power_and_addons_workflow(live_client):
    # Step 1: Check Trapper Detail (power, perks, addons)
    trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
    if trapper_res.status_code == 404:
        trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
    assert trapper_res.status_code == 200
    trapper = trapper_res.get_json()["data"]
    assert trapper["character"]["name"] == "The Trapper"
    assert len(trapper["perks"]) == 3
    assert len(trapper["addons"]) > 0

    # Step 2: Check Items (Toolbox, Med-Kit)
    item_res = live_client.get("/api/v1/items?category=Toolbox")
    assert item_res.status_code == 200
    items = item_res.get_json()["data"]
    assert len(items) > 0
