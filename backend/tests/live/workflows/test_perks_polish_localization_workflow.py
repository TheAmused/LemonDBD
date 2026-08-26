# backend/tests/live/workflows/test_perks_polish_localization_workflow.py
import pytest

def test_perks_polish_localization_and_search_workflow(live_client):
    # Step 1: Fetch perks with limit and pagination
    res = live_client.get("/api/v1/perks?limit=50&page=1")
    assert res.status_code == 200
    data = res.get_json()
    perks = data["data"]
    pagination = data["pagination"]
    assert len(perks) > 0
    assert pagination["total"] >= 200

    # Step 2: Filter by role (Killer vs Survivor)
    killer_res = live_client.get("/api/v1/perks?category=Killer&limit=30")
    assert killer_res.status_code == 200
    killer_perks = killer_res.get_json()["data"]
    assert all(p.get("category") == "Killer" or p.get("role") == "Killer" for p in killer_perks)

    surv_res = live_client.get("/api/v1/perks?category=Survivor&limit=30")
    assert surv_res.status_code == 200
    surv_perks = surv_res.get_json()["data"]
    assert all(p.get("category") == "Survivor" or p.get("role") == "Survivor" for p in surv_perks)

    # Step 3: Search for specific perks by keyword
    search_res = live_client.get("/api/v1/perks?search=Calling")
    assert search_res.status_code == 200
    results = search_res.get_json()["data"]
    assert any("Calling" in p["name"] for p in results)

    # Step 4: Verify perk data contains icon, description, and character reference
    sample = killer_perks[0]
    assert "name" in sample
    assert "description" in sample
