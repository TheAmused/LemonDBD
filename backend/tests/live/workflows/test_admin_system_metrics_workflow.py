# backend/tests/live/workflows/test_admin_system_metrics_workflow.py
from collections.abc import Callable

import pytest
from flask.testing import FlaskClient

from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestAdminSystemMetricsWorkflow:
    """Workflow validating administrative system metric querying and backup export generation."""

    def test_admin_system_metrics_workflow(
        self, live_client: FlaskClient, admin_client: AuthenticatedClient, db_count: Callable[..., int]
    ) -> None:
        stats_res = admin_client.get("/api/v1/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.get_json()
        assert stats["users"]["total"] == db_count("SELECT count(*) FROM users")
        assert stats["users"]["admins"] == db_count("SELECT count(*) FROM users WHERE role = 'admin'")
        assert stats["users"]["admins"] + stats["users"]["players"] == stats["users"]["total"]
        assert set(stats["pending"]) == {"bug_reports", "content_reports"}

        export_res = admin_client.post("/api/v1/admin/database/export", json={"targets": ["perks", "survivors", "killers"]})
        assert export_res.status_code == 200
        export = export_res.get_json()
        assert export["counts"] == {
            "perks": db_count("SELECT count(*) FROM perks"),
            "survivors": db_count("SELECT count(*) FROM survivors"),
            "killers": db_count("SELECT count(*) FROM killers"),
        }

        # Not signed in: no stats.
        assert live_client.get("/api/v1/admin/stats").status_code == 401
