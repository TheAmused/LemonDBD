# backend/tests/live/workflows/test_admin_multimode_killswitch_workflow.py
import pytest

def test_admin_multimode_killswitch_workflow(live_client, admin_client, auth_client_factory):
    client, headers, user = auth_client_factory("killswitch_user", "ksuser@test.com", "pass123")

    # Step 1: Read all challenge mode statuses via admin endpoint
    modes_res = admin_client.get("/api/v1/admin/challenge-modes")
    assert modes_res.status_code == 200
    modes = modes_res.get_json()["modes"]
    mode_names = [m["mode"] for m in modes]
    assert "chaos" in mode_names

    # Step 2: Admin disables chaos mode
    dis_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": False,
        "reason": "Temporary Chaos Maintenance"
    })
    assert dis_res.status_code == 200

    # Step 3: Player attempt to start chaos run is rejected with 400
    blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert blocked_res.status_code == 400
    assert "disabled" in blocked_res.get_json()["error"].lower()

    # Step 4: Admin reenables chaos mode
    en_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={"is_enabled": True})
    assert en_res.status_code == 200

    # Step 5: Player can start chaos run
    unblocked = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=headers)
    assert unblocked.status_code == 200
