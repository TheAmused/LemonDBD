# backend/tests/unit/test_admin_content_moderation.py
import pytest
from datetime import datetime, timezone, timedelta
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.core.security import generate_token
from app.models.admin import AdminAuditLog
from app.models.content_moderation import ContentReport, ContentRevocation
from app.models.user import User


def _auth_headers(user: User) -> dict[str, str]:
    token = generate_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(db_session: Session) -> User:
    user = User(
        login="admin_mod",
        username="Admin Mod",
        email="admin_mod@example.com",
        password_hash="hashed_admin",
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def regular_user(db_session: Session) -> User:
    user = User(
        login="regular_user",
        username="Regular User",
        email="regular@example.com",
        password_hash="hashed_user",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def author_user(db_session: Session) -> User:
    user = User(
        login="author_user",
        username="Author User",
        email="author@example.com",
        password_hash="hashed_author",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_admin_listing_reports_pagination_and_priority_order(
    client: FlaskClient, admin_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=7)

    # Create reports with different counts and statuses
    r1 = ContentReport(
        content_type="tier_list",
        content_hash="1" * 64,
        author_login="author1",
        primary_reason="spam",
        report_count=2,
        status="pending",
        evidence_payload='{"data": "r1"}',
        expires_at=future,
    )
    r2 = ContentReport(
        content_type="tier_list",
        content_hash="2" * 64,
        author_login="author2",
        primary_reason="harassment",
        report_count=10,
        status="pending",
        evidence_payload='{"data": "r2"}',
        expires_at=future,
    )
    r3 = ContentReport(
        content_type="tier_list",
        content_hash="3" * 64,
        author_login="author3",
        primary_reason="hate_speech",
        report_count=5,
        status="pending",
        evidence_payload='{"data": "r3"}',
        expires_at=future,
    )
    r4 = ContentReport(
        content_type="tier_list",
        content_hash="4" * 64,
        author_login="author4",
        primary_reason="nsfw",
        report_count=20,
        status="dismissed",
        evidence_payload=None,
        expires_at=future,
    )
    db_session.add_all([r1, r2, r3, r4])
    db_session.commit()

    # Page 1 (per_page=2, status=pending): should return r2 (10) and r3 (5)
    res = client.get(
        "/api/v1/admin/content-reports?status=pending&page=1&per_page=2",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] == 3
    assert data["page"] == 1
    assert data["per_page"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["content_hash"] == "2" * 64
    assert data["items"][0]["report_count"] == 10
    assert data["items"][1]["content_hash"] == "3" * 64
    assert data["items"][1]["report_count"] == 5

    # CRITICAL: In list view, evidence_payload must NEVER be leaked
    assert "evidence_payload" not in data["items"][0]
    assert "evidence_payload" not in data["items"][1]

    # Page 2 (per_page=2, status=pending): should return r1 (2)
    res_page2 = client.get(
        "/api/v1/admin/content-reports?status=pending&page=2&per_page=2",
        headers=headers,
    )
    assert res_page2.status_code == 200
    data_page2 = res_page2.get_json()
    assert len(data_page2["items"]) == 1
    assert data_page2["items"][0]["content_hash"] == "1" * 64
    assert "evidence_payload" not in data_page2["items"][0]

    # Filter status=dismissed
    res_dismissed = client.get(
        "/api/v1/admin/content-reports?status=dismissed",
        headers=headers,
    )
    assert res_dismissed.status_code == 200
    data_dismissed = res_dismissed.get_json()
    assert data_dismissed["total"] == 1
    assert data_dismissed["items"][0]["content_hash"] == "4" * 64


def test_admin_preview_endpoint(
    client: FlaskClient, admin_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    payload_str = '{"tiers": {"S": ["Dead Hard", "Sprint Burst"]}}'
    future = datetime.now(timezone.utc) + timedelta(days=7)

    report = ContentReport(
        content_type="tier_list",
        content_hash="a" * 64,
        author_login="bad_author",
        primary_reason="copyright_infringement",
        report_count=3,
        status="pending",
        evidence_payload=payload_str,
        expires_at=future,
    )
    db_session.add(report)
    db_session.commit()

    # Valid preview request
    res = client.get(f"/api/v1/admin/content-reports/{report.id}/preview", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == report.id
    assert data["content_type"] == "tier_list"
    assert data["content_hash"] == "a" * 64
    assert data["author_login"] == "bad_author"
    assert data["report_count"] == 3
    assert data["primary_reason"] == "copyright_infringement"
    assert data["status"] == "pending"
    assert data["evidence_payload"] == payload_str

    # Non-existent report 404
    res_404 = client.get("/api/v1/admin/content-reports/999999/preview", headers=headers)
    assert res_404.status_code == 404


def test_admin_resolve_ban_zero_retention_wipe(
    client: FlaskClient, admin_user: User, author_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    payload_str = '{"bad_content": "toxic slurs"}'
    future = datetime.now(timezone.utc) + timedelta(days=7)

    report = ContentReport(
        content_type="tier_list",
        content_hash="b" * 64,
        author_id=author_user.id,
        author_login=author_user.login,
        primary_reason="hate_speech",
        report_count=4,
        status="pending",
        evidence_payload=payload_str,
        expires_at=future,
    )
    db_session.add(report)
    db_session.commit()

    # Resolve with action="ban" and ban_author=True
    res = client.post(
        f"/api/v1/admin/content-reports/{report.id}/resolve",
        headers=headers,
        json={
            "action": "ban",
            "ban_author": True,
            "admin_notes": "Banned for hate speech against TOS",
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["report_id"] == report.id
    assert "message" in data

    # 1. ContentRevocation record created
    revocation = db_session.scalar(
        select(ContentRevocation).where(ContentRevocation.content_hash == "b" * 64)
    )
    assert revocation is not None
    assert revocation.content_type == "tier_list"
    assert revocation.author_id == author_user.id
    assert revocation.reason == "hate_speech"
    assert revocation.revoked_by_id == admin_user.id

    # 2. Author deactivated
    db_session.refresh(author_user)
    assert author_user.is_active is False

    # 3. Report updated
    db_session.refresh(report)
    assert report.status == "resolved_banned"
    assert report.resolved_by_id == admin_user.id
    assert report.resolved_at is not None
    assert report.admin_notes == "Banned for hate speech against TOS"

    # 4. CRITICAL ZERO-RETENTION HARD WIPE: evidence payload must be None
    assert report.evidence_payload is None

    # 5. AdminAuditLog entry created
    audit = db_session.scalar(
        select(AdminAuditLog).where(
            AdminAuditLog.action == "content_ban",
            AdminAuditLog.target_id == "b" * 64,
        )
    )
    assert audit is not None
    assert audit.admin_user_id == admin_user.id
    assert audit.target_type == "content"


def test_admin_resolve_dismiss_zero_retention_wipe(
    client: FlaskClient, admin_user: User, author_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    payload_str = '{"innocent": "legitimate discussion"}'
    future = datetime.now(timezone.utc) + timedelta(days=7)

    report = ContentReport(
        content_type="tier_list",
        content_hash="c" * 64,
        author_id=author_user.id,
        author_login=author_user.login,
        primary_reason="harassment",
        report_count=1,
        status="pending",
        evidence_payload=payload_str,
        expires_at=future,
    )
    db_session.add(report)
    db_session.commit()

    # Resolve with action="dismiss"
    res = client.post(
        f"/api/v1/admin/content-reports/{report.id}/resolve",
        headers=headers,
        json={
            "action": "dismiss",
            "ban_author": False,
            "admin_notes": "Not a TOS violation",
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["report_id"] == report.id

    # 1. No ContentRevocation record
    revocation = db_session.scalar(
        select(ContentRevocation).where(ContentRevocation.content_hash == "c" * 64)
    )
    assert revocation is None

    # 2. Author still active
    db_session.refresh(author_user)
    assert author_user.is_active is True

    # 3. Report updated
    db_session.refresh(report)
    assert report.status == "dismissed"
    assert report.resolved_by_id == admin_user.id
    assert report.resolved_at is not None
    assert report.admin_notes == "Not a TOS violation"

    # 4. CRITICAL ZERO-RETENTION HARD WIPE: evidence payload must be None
    assert report.evidence_payload is None

    # 5. AdminAuditLog entry created
    audit = db_session.scalar(
        select(AdminAuditLog).where(
            AdminAuditLog.action == "content_dismiss",
            AdminAuditLog.target_id == "c" * 64,
        )
    )
    assert audit is not None
    assert audit.admin_user_id == admin_user.id
    assert audit.target_type == "content"


def test_purge_expired_evidence(
    client: FlaskClient, admin_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    now = datetime.now(timezone.utc)
    expired_time = now - timedelta(hours=2)
    valid_time = now + timedelta(days=5)

    # 1. Expired pending report -> should be purged
    r_expired = ContentReport(
        content_type="tier_list",
        content_hash="e" * 64,
        author_login="author_e",
        primary_reason="spam",
        report_count=1,
        status="pending",
        evidence_payload='{"expired": "payload"}',
        expires_at=expired_time,
    )
    # 2. Valid pending report -> should NOT be touched
    r_valid = ContentReport(
        content_type="tier_list",
        content_hash="f" * 64,
        author_login="author_f",
        primary_reason="spam",
        report_count=2,
        status="pending",
        evidence_payload='{"valid": "payload"}',
        expires_at=valid_time,
    )
    # 3. Already resolved report with past expiry -> should NOT be modified
    r_resolved = ContentReport(
        content_type="tier_list",
        content_hash="g" * 64,
        author_login="author_g",
        primary_reason="spam",
        report_count=1,
        status="resolved_banned",
        evidence_payload=None,
        expires_at=expired_time,
    )
    db_session.add_all([r_expired, r_valid, r_resolved])
    db_session.commit()

    res = client.post("/api/v1/admin/content-reports/purge-expired", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["purged_count"] == 1

    db_session.refresh(r_expired)
    assert r_expired.status == "expired"
    assert r_expired.evidence_payload is None

    db_session.refresh(r_valid)
    assert r_valid.status == "pending"
    assert r_valid.evidence_payload == '{"valid": "payload"}'

    db_session.refresh(r_resolved)
    assert r_resolved.status == "resolved_banned"


def test_admin_content_reports_forbidden_for_non_admin_and_unauthenticated(
    client: FlaskClient, regular_user: User
) -> None:
    reg_headers = _auth_headers(regular_user)

    endpoints = [
        ("GET", "/api/v1/admin/content-reports", {}),
        ("GET", "/api/v1/admin/content-reports/1/preview", {}),
        ("POST", "/api/v1/admin/content-reports/1/resolve", {"action": "dismiss"}),
        ("POST", "/api/v1/admin/content-reports/purge-expired", {}),
    ]

    for method, url, body in endpoints:
        # 1. Non-admin user gets 403
        if method == "GET":
            res_user = client.get(url, headers=reg_headers)
        else:
            res_user = client.post(url, headers=reg_headers, json=body)
        assert res_user.status_code == 403

        # 2. Unauthenticated user gets 401
        if method == "GET":
            res_anon = client.get(url)
        else:
            res_anon = client.post(url, json=body)
        assert res_anon.status_code == 401


def test_admin_resolve_invalid_action_rejected(
    client: FlaskClient, admin_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    future = datetime.now(timezone.utc) + timedelta(days=7)
    report = ContentReport(
        content_type="tier_list",
        content_hash="h" * 64,
        author_login="bad",
        primary_reason="spam",
        report_count=1,
        status="pending",
        expires_at=future,
    )
    db_session.add(report)
    db_session.commit()

    res = client.post(
        f"/api/v1/admin/content-reports/{report.id}/resolve",
        headers=headers,
        json={"action": "unknown_action"},
    )
    assert res.status_code == 400


def test_admin_resolve_already_resolved_report_conflict_409(
    client: FlaskClient, admin_user: User, author_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    future = datetime.now(timezone.utc) + timedelta(days=7)

    # 1. Test re-resolving a report that was resolved_banned
    report_banned = ContentReport(
        content_type="tier_list",
        content_hash="i" * 64,
        author_id=author_user.id,
        author_login=author_user.login,
        primary_reason="hate_speech",
        status="resolved_banned",
        expires_at=future,
    )
    # 2. Test re-resolving a report that was dismissed
    report_dismissed = ContentReport(
        content_type="tier_list",
        content_hash="j" * 64,
        author_id=author_user.id,
        author_login=author_user.login,
        primary_reason="spam",
        status="dismissed",
        expires_at=future,
    )
    db_session.add_all([report_banned, report_dismissed])
    db_session.commit()

    res_banned = client.post(
        f"/api/v1/admin/content-reports/{report_banned.id}/resolve",
        headers=headers,
        json={"action": "ban"},
    )
    assert res_banned.status_code == 409
    assert "already been resolved" in res_banned.get_json()["error"]

    res_dismissed = client.post(
        f"/api/v1/admin/content-reports/{report_dismissed.id}/resolve",
        headers=headers,
        json={"action": "dismiss"},
    )
    assert res_dismissed.status_code == 409
    assert "already been resolved" in res_dismissed.get_json()["error"]


def test_admin_resolve_ban_author_protects_admin_role(
    client: FlaskClient, admin_user: User, db_session: Session
) -> None:
    headers = _auth_headers(admin_user)
    future = datetime.now(timezone.utc) + timedelta(days=7)

    # Create another admin user as the content author
    another_admin = User(
        login="another_admin",
        username="Another Admin",
        email="another_admin@example.com",
        password_hash="pw_admin_2",
        role="admin",
        is_active=True,
    )
    db_session.add(another_admin)
    db_session.commit()

    report = ContentReport(
        content_type="tier_list",
        content_hash="k" * 64,
        author_id=another_admin.id,
        author_login=another_admin.login,
        primary_reason="harassment",
        status="pending",
        evidence_payload='{"bad": "content"}',
        expires_at=future,
    )
    db_session.add(report)
    db_session.commit()

    res = client.post(
        f"/api/v1/admin/content-reports/{report.id}/resolve",
        headers=headers,
        json={"action": "ban", "ban_author": True},
    )
    assert res.status_code == 200

    # Ensure admin account was NOT deactivated
    db_session.refresh(another_admin)
    assert another_admin.is_active is True

