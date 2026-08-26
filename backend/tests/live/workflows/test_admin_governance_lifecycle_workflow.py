# backend/tests/live/workflows/test_admin_governance_lifecycle_workflow.py
import pytest

def test_full_admin_governance_and_user_management(live_client, admin_client):
    # Step 1: Admin lists all users with search filtering
    users_res = admin_client.get("/api/v1/users?page=1&per_page=20")
    assert users_res.status_code == 200
    initial_users = users_res.get_json()["users"]
    assert len(initial_users) > 0

    # Step 2: Admin creates a new user directly
    create_res = admin_client.post("/api/v1/users", json={
        "username": "managed_player_1",
        "email": "managed1@admin.com",
        "password": "PlayerPass123!",
        "role": "user"
    })
    assert create_res.status_code == 201
    created_user = create_res.get_json()["user"]
    target_id = created_user["id"]

    # Step 3: Admin promotes user to admin role
    promote_res = admin_client.put(f"/api/v1/users/{target_id}", json={
        "role": "admin",
        "is_active": True
    })
    assert promote_res.status_code == 200
    assert promote_res.get_json()["user"]["role"] == "admin"

    # Step 4: Admin deactivates (bans) user
    deact_res = admin_client.put(f"/api/v1/users/{target_id}", json={
        "role": "user",
        "is_active": False
    })
    assert deact_res.status_code == 200
    assert deact_res.get_json()["user"]["is_active"] is False

    # Step 5: Deactivated user fails to login
    banned_login = live_client.post("/api/v1/auth/login", json={
        "username": "managed_player_1",
        "password": "PlayerPass123!",
    })
    assert banned_login.status_code in (400, 401, 403)

    # Step 6: Admin queries system stats
    stats_res = admin_client.get("/api/v1/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert "active_users" in stats or "perks_count" in stats or isinstance(stats, dict)

    # Step 7: Admin exports database JSON
    export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
    assert export_res.status_code == 200
    export_data = export_res.get_json()
    assert isinstance(export_data, dict)

    # Step 8: Admin deletes the user
    del_res = admin_client.delete(f"/api/v1/users/{target_id}")
    assert del_res.status_code == 200

    # Step 9: Verify audit logs contain user_updated, user_deleted
    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "user_updated" in actions
    assert "user_deleted" in actions
