# backend/tests/live/api/test_live_admin_api.py
import pytest

def test_live_admin_killswitch_and_audit(admin_client):
    # 1. Admin lists characters
    res = admin_client.get("/api/v1/admin/characters")
    assert res.status_code == 200
    chars = res.get_json()["data"]
    assert len(chars) > 0
    trapper = next((c for c in chars if c["name"] == "The Trapper"), chars[0])
    target_id = trapper["id"]

    # 2. Disable character via PUT
    res_dis = admin_client.put(f"/api/v1/admin/characters/{target_id}/disable", json={"is_disabled": True, "reason": "Live Test Maintenance"})
    assert res_dis.status_code == 200

    # 3. Enable character via PUT
    res_en = admin_client.put(f"/api/v1/admin/characters/{target_id}/disable", json={"is_disabled": False})
    assert res_en.status_code == 200

    # 4. Verify audit log entry
    res_audit = admin_client.get("/api/v1/admin/audit-logs")
    assert res_audit.status_code == 200
    logs = res_audit.get_json().get("logs", [])
    assert len(logs) > 0
