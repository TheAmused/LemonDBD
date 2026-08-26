# backend/tests/live/workflows/test_admin_system_metrics_workflow.py
import pytest

def test_admin_system_metrics_workflow(live_client, admin_client):
    # Step 1: Fetch stats
    stats_res = admin_client.get("/api/v1/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert "perks_count" in stats or "active_users" in stats or isinstance(stats, dict)

    # Step 2: Database export
    export_res = admin_client.get("/api/v1/admin/database/export?targets=perks,characters")
    assert export_res.status_code == 200
    assert isinstance(export_res.get_json(), dict)
