# backend/tests/live/workflows/test_admin_killswitch_workflow.py
import pytest

def test_full_admin_killswitch_audit_workflow(live_client, admin_client, auth_client_factory):
    # Step 1: Regular user creates gauntlet run
    client, user_headers, user = auth_client_factory("player_wf", "player@wf.com", "pass123")

    # Step 2: Admin checks challenge modes
    modes_res = admin_client.get("/api/v1/admin/challenge-modes")
    assert modes_res.status_code == 200
    modes = modes_res.get_json()["modes"]
    assert any(m["mode"] == "chaos" for m in modes)

    # Step 3: Admin disables chaos challenge mode
    dis_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": False,
        "reason": "Emergency Maintenance"
    })
    assert dis_res.status_code == 200

    # Step 4: Regular user tries to start chaos run -> gets blocked (400)
    blocked_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
    assert blocked_res.status_code == 400
    assert "disabled" in blocked_res.get_json()["error"].lower()

    # Step 5: Admin re-enables chaos challenge mode
    en_res = admin_client.put("/api/v1/admin/challenge-modes/chaos", json={
        "is_enabled": True
    })
    assert en_res.status_code == 200

    # Step 6: Regular user can now start chaos run
    ok_res = client.get("/api/v1/chaos-streak/run?difficulty=easy", headers=user_headers)
    assert ok_res.status_code == 200

    # Step 7: Verify audit logs contain all events in order
    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "challenge_mode_disabled" in actions
    assert "challenge_mode_enabled" in actions
