# backend/tests/live/api/test_live_admin_api.py
import pytest
from flask.testing import FlaskClient

from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
class TestLiveAdminAPI:
    """Tests for administrative character killswitch toggles, audit logs, and settings in PostgreSQL."""

    def test_live_admin_killswitch_and_audit(self, admin_client: AuthenticatedClient, live_client: FlaskClient) -> None:
        chars = admin_client.get("/api/v1/admin/characters").get_json()["data"]
        trapper = next(c for c in chars if c["name"] == "The Trapper")
        assert trapper["is_disabled"] is False

        res_dis = admin_client.put(
            f"/api/v1/admin/characters/{trapper['id']}/disable",
            json={"is_disabled": True, "reason": "Live Test Maintenance"},
        )
        assert res_dis.status_code == 200
        assert res_dis.get_json()["character"] == {"id": trapper["id"], "name": "The Trapper", "is_disabled": True, "disabled_reason": "Live Test Maintenance"}
        listed = next(c for c in admin_client.get("/api/v1/admin/characters").get_json()["data"] if c["id"] == trapper["id"] and c["role"] == "Killer")
        assert (listed["is_disabled"], listed["disabled_reason"]) == (True, "Live Test Maintenance")

        res_en = admin_client.put(f"/api/v1/admin/characters/{trapper['id']}/disable", json={"is_disabled": False})
        assert res_en.status_code == 200
        assert res_en.get_json()["character"]["is_disabled"] is False

        logs = admin_client.get("/api/v1/admin/audit-logs").get_json()["logs"]
        disabled = next(entry for entry in logs if entry["action"] == "character_disabled" and entry["target_id"] == f"killer:{trapper['id']}")
        assert '"reason":"Live Test Maintenance"' in disabled["details"]
        assert disabled["admin_username"] == "admin_live_tester"

        # Not an admin: no access.
        assert live_client.put(f"/api/v1/admin/characters/{trapper['id']}/disable", json={"is_disabled": True}).status_code == 401
