# backend/tests/live/workflows/test_generator_lock_and_redraw_workflow.py
import pytest


@pytest.mark.live
@pytest.mark.workflow
def test_generator_lock_and_redraw_workflow(live_client, auth_client_factory):
    client, headers, user = auth_client_factory("gen_user_lock", "genlock@example.com", "pass123")

    config_res = client.post("/api/v1/generator/config", json={
        "role": "Survivor",
        "mode": "random",
        "lock_perks": False,
    })
    assert config_res.status_code == 200

    draw1 = client.post("/api/v1/generator/draw", json={
        "role": "Survivor",
        "perks": ["Sprint Burst", "Self-Care", "Adrenaline", "Iron Will"]
    })
    assert draw1.status_code == 200
    drawn1 = draw1.get_json()["drawn_perks"]
    assert len(drawn1) >= 4

    draw2 = client.post("/api/v1/generator/draw", json={
        "role": "Survivor",
        "perks": ["Sprint Burst", "Adrenaline", "Kindred", "Decisive Strike"]
    })
    assert draw2.status_code == 200
    drawn2 = draw2.get_json()["drawn_perks"]
    assert len(drawn2) >= 4
    assert "Sprint Burst" in drawn2
    assert "Adrenaline" in drawn2

    reset_res = client.post("/api/v1/generator/reset", json={"role": "Survivor"})
    assert reset_res.status_code == 200
    assert len(reset_res.get_json()["drawn_perks"]) == 0
