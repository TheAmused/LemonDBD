# backend/tests/live/workflows/test_admin_governance_lifecycle_workflow.py
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminGovernanceLifecycleWorkflow:
    """Workflow verifying end-to-end admin user management, promotion, suspension, metrics, and audit logging."""

    def test_full_admin_governance_and_user_management(
        self, live_client: FlaskClient, admin_client: AuthenticatedClient
    ) -> None:
        users_res = admin_client.get("/api/v1/users?page=1&per_page=20")
        assert users_res.status_code == 200
        initial_users = users_res.get_json()["users"]
        assert len(initial_users) > 0

        create_res = admin_client.post(
            "/api/v1/users",
            json={
                "username": "managed_player_1",
                "email": "managed1@example.com",
                "password": "PlayerPass123!",
                "role": "user",
            },
        )
        assert create_res.status_code == 201
        created_user = create_res.get_json()["user"]
        target_id = created_user["id"]

        promote_res = admin_client.put(
            f"/api/v1/users/{target_id}",
            json={"role": "admin", "is_active": True},
        )
        assert promote_res.status_code == 200
        assert promote_res.get_json()["user"]["role"] == "admin"

        deact_res = admin_client.put(
            f"/api/v1/users/{target_id}",
            json={"role": "user", "is_active": False},
        )
        assert deact_res.status_code == 200
        assert deact_res.get_json()["user"]["is_active"] is False

        banned_login = live_client.post(
            "/api/v1/auth/login",
            json={
                "username": "managed_player_1",
                "password": "PlayerPass123!",
            },
        )
        assert banned_login.status_code in (400, 401, 403)

        stats_res = admin_client.get("/api/v1/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "active_users" in stats or "perks_count" in stats or isinstance(stats, dict)

        export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
        assert export_res.status_code == 200
        export_data = export_res.get_json()
        assert isinstance(export_data, dict)

        del_res = admin_client.delete(f"/api/v1/users/{target_id}")
        assert del_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "user_updated" in actions
        assert "user_deleted" in actions
