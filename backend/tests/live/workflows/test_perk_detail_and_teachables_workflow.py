# backend/tests/live/workflows/test_perk_detail_and_teachables_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_perk_detail_and_teachables_association_workflow(live_client):
    meg_res = live_client.get("/api/v1/characters/Meg_Thomas/detail")
    if meg_res.status_code == 404:
        meg_res = live_client.get("/api/v1/characters/Meg%20Thomas/detail")
    assert meg_res.status_code == 200
    meg_data = meg_res.get_json()["data"]
    assert meg_data["character"]["name"] == "Meg Thomas"
    meg_perk_names = [p["name"] for p in meg_data["perks"]]
    assert len(meg_perk_names) == 3
    assert any("Sprint Burst" in name for name in meg_perk_names) or any("Adrenaline" in name for name in meg_perk_names) or any("Quick & Quiet" in name for name in meg_perk_names)

    trapper_res = live_client.get("/api/v1/characters/The_Trapper/detail")
    if trapper_res.status_code == 404:
        trapper_res = live_client.get("/api/v1/characters/The%20Trapper/detail")
    assert trapper_res.status_code == 200
    trapper_data = trapper_res.get_json()["data"]
    trapper_perk_names = [p["name"] for p in trapper_data["perks"]]
    assert len(trapper_perk_names) == 3
    assert any("Agitation" in name or "Brutal Strength" in name or "Unnerving Presence" in name for name in trapper_perk_names)
