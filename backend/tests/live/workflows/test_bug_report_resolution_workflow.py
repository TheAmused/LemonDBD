# backend/tests/live/workflows/test_bug_report_resolution_workflow.py
from typing import Any, Callable
import pytest
from flask.testing import FlaskClient
from tests.live.conftest import AuthenticatedClient


@pytest.mark.live
@pytest.mark.workflow
class TestBugReportResolutionWorkflow:
    """Workflow tracking player bug report submission, status transitions, and administrative resolution."""

    def test_full_bug_report_submission_triage_and_resolution(
        self,
        live_client: FlaskClient,
        admin_client: AuthenticatedClient,
        auth_client_factory: Callable[..., tuple[FlaskClient, dict[str, str], dict[str, Any]]],
    ) -> None:
        client, user_headers, user = auth_client_factory(
            "reporter_player", "reporter@example.com", "pass123"
        )

        submit_res = client.post(
            "/api/v1/bug-reports",
            json={
                "title": "Nurse Blink Collision Desync on Crotus Prenn",
                "message": "When blinking near the Asylum main building staircase, the killer clips into collision geometry.",
                "category": "Gameplay",
                "images": [],
            },
            headers=user_headers,
        )
        assert submit_res.status_code == 201
        report = submit_res.get_json()["report"]
        report_id = report["id"]
        assert report["status"] == "pending"

        my_reports_res = client.get("/api/v1/bug-reports/my", headers=user_headers)
        assert my_reports_res.status_code == 200
        my_reports = my_reports_res.get_json()["reports"]
        assert any(r["id"] == report_id for r in my_reports)

        admin_list_res = admin_client.get("/api/v1/admin/bug-reports?status=pending")
        assert admin_list_res.status_code == 200
        pending_list = admin_list_res.get_json()["reports"]
        assert any(r["id"] == report_id for r in pending_list)

        prog_res = admin_client.put(
            f"/api/v1/admin/bug-reports/{report_id}",
            json={
                "status": "in_progress",
                "admin_notes": "Assigned to physics replication team.",
            },
        )
        assert prog_res.status_code == 200
        assert prog_res.get_json()["report"]["status"] == "in_progress"

        resolve_res = admin_client.put(
            f"/api/v1/admin/bug-reports/{report_id}",
            json={
                "status": "resolved",
                "admin_notes": "Fixed mesh collision boundaries in patch 2.4.1.",
            },
        )
        assert resolve_res.status_code == 200
        assert resolve_res.get_json()["report"]["status"] == "resolved"

        my_reports_res2 = client.get("/api/v1/bug-reports/my", headers=user_headers)
        assert my_reports_res2.status_code == 200
        resolved_ticket = next(
            r for r in my_reports_res2.get_json()["reports"] if r["id"] == report_id
        )
        assert resolved_ticket["status"] == "resolved"
        assert "patch 2.4.1" in resolved_ticket.get("admin_notes", "")

        del_res = admin_client.delete(f"/api/v1/admin/bug-reports/{report_id}")
        assert del_res.status_code == 200

        audit_res = admin_client.get("/api/v1/admin/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.get_json()["logs"]
        actions = [l["action"] for l in logs]
        assert "bug_report_updated" in actions
        assert "bug_report_deleted" in actions
