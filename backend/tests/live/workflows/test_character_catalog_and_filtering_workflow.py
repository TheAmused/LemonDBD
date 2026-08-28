# backend/tests/live/workflows/test_character_catalog_and_filtering_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_character_catalog_and_filtering_workflow(live_client):
    killers_res = live_client.get("/api/v1/killers")
    assert killers_res.status_code == 200
    killers = killers_res.get_json()["data"]
    assert len(killers) >= 30
    assert all(k["role"] == "Killer" for k in killers)

    surv_res = live_client.get("/api/v1/survivors")
    assert surv_res.status_code == 200
    survivors = surv_res.get_json()["data"]
    assert len(survivors) >= 30
    assert all(s["role"] == "Survivor" for s in survivors)

    assert any("release_number" in k for k in killers)
