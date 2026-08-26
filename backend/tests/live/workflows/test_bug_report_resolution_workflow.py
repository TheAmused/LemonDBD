# backend/tests/live/workflows/test_bug_report_resolution_workflow.py
import pytest

def test_full_bug_report_submission_triage_and_resolution(live_client, admin_client, auth_client_factory):
    # Step 1: Normal player registers and reports a bug
    client, user_headers, user = auth_client_factory("reporter_player", "reporter@test.com", "pass123")

    submit_res = client.post("/api/v1/bug-reports", json={
        "title": "Nurse Blink Collision Desync on Crotus Prenn",
        "message": "When blinking near the Asylum main building staircase, the killer clips into collision geometry.",
        "category": "Gameplay",
        "images": []
    }, headers=user_headers)
    assert submit_res.status_code == 201
    report = submit_res.get_json()["report"]
    report_id = report["id"]
    assert report["status"] == "pending"

    # Step 2: Player checks their own submitted bug reports
    my_reports_res = client.get("/api/v1/bug-reports/my", headers=user_headers)
    assert my_reports_res.status_code == 200
    my_reports = my_reports_res.get_json()["reports"]
    assert any(r["id"] == report_id for r in my_reports)

    # Step 3: Admin lists pending bug reports
    admin_list_res = admin_client.get("/api/v1/admin/bug-reports?status=pending")
    assert admin_list_res.status_code == 200
    pending_list = admin_list_res.get_json()["reports"]
    assert any(r["id"] == report_id for r in pending_list)

    # Step 4: Admin moves ticket to in_progress
    prog_res = admin_client.put(f"/api/v1/admin/bug-reports/{report_id}", json={
        "status": "in_progress",
        "admin_notes": "Assigned to physics replication team."
    })
    assert prog_res.status_code == 200
    assert prog_res.get_json()["report"]["status"] == "in_progress"

    # Step 5: Admin resolves ticket with hotfix resolution note
    resolve_res = admin_client.put(f"/api/v1/admin/bug-reports/{report_id}", json={
        "status": "resolved",
        "admin_notes": "Fixed mesh collision boundaries in patch 2.4.1."
    })
    assert resolve_res.status_code == 200
    assert resolve_res.get_json()["report"]["status"] == "resolved"

    # Step 6: Player verifies their report shows resolved with admin notes
    my_reports_res2 = client.get("/api/v1/bug-reports/my", headers=user_headers)
    assert my_reports_res2.status_code == 200
    resolved_ticket = next(r for r in my_reports_res2.get_json()["reports"] if r["id"] == report_id)
    assert resolved_ticket["status"] == "resolved"
    assert "patch 2.4.1" in resolved_ticket.get("admin_notes", "")

    # Step 7: Admin cleans up ticket and verifies audit log
    del_res = admin_client.delete(f"/api/v1/admin/bug-reports/{report_id}")
    assert del_res.status_code == 200

    audit_res = admin_client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.get_json()["logs"]
    actions = [l["action"] for l in logs]
    assert "bug_report_updated" in actions
    assert "bug_report_deleted" in actions
