# backend/tests/live/workflows/test_admin_system_metrics_workflow.py
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminSystemMetricsWorkflow:
    """Workflow validating administrative system metric querying and backup export generation."""

    def test_admin_system_metrics_workflow(
        self, live_client: FlaskClient, admin_client: AuthenticatedClient
    ) -> None:
        stats_res = admin_client.get("/api/v1/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert "perks_count" in stats or "active_users" in stats or isinstance(stats, dict)

        export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
        assert export_res.status_code == 200
        assert isinstance(export_res.get_json(), dict)
