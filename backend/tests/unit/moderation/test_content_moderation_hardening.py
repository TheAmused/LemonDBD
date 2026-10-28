# backend/tests/unit/moderation/test_content_moderation_hardening.py
"""Regression tests for the moderation audit: reporter dedup, unsigned reports, allowlists,
document-level revocation checks, admin preview data, the open-report unique index and the
scheduled zero-retention purge."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
import sqlalchemy as sa
from flask.testing import FlaskClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import generate_token
from app.models.content_moderation import (
    ContentReport,
    ContentReportSubscriber,
    ContentRevocation,
)
from app.models.user import User
from app.services.content_crypto import canonicalize_payload, compute_content_hash, sign_content


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


def _make_user(db_session: Session, login: str, role: str = "user") -> User:
    user = User(
        login=login,
        username=login.title(),
        email=f"{login}@example.com",
        password_hash="hashed_pw",
        role=role,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def author(db_session: Session) -> User:
    return _make_user(db_session, "audit_author")


@pytest.fixture
def reporters(db_session: Session) -> list[User]:
    return [_make_user(db_session, f"audit_reporter_{i}") for i in range(3)]


@pytest.fixture
def admin(db_session: Session) -> User:
    return _make_user(db_session, "audit_admin", role="admin")


def _signed_body(author: User, app, payload: dict, content_type: str = "tier_list", reason: str = "hate_speech") -> dict:
    content_hash = compute_content_hash(canonicalize_payload(payload))
    return {
        "content_type": content_type,
        "content_hash": content_hash,
        "author_id": author.id,
        "author_login": author.login,
        "signature": sign_content(author.id, content_hash, app.config["SECRET_KEY"]),
        "payload": payload,
        "reason": reason,
    }


# --- reporter dedup -------------------------------------------------------------------------


def test_one_reporter_cannot_inflate_report_count(client: FlaskClient, author, reporters, app, db_session) -> None:
    body = _signed_body(author, app, {"title": "Spammed"})
    first = client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=body)
    assert first.status_code == 201

    for _ in range(5):
        again = client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=body)
        assert again.status_code == 200
        assert again.get_json()["already_reported"] is True
        assert again.get_json()["report_count"] == 1

    other = client.post("/api/v1/content/reports", headers=_headers(reporters[1]), json=body)
    assert other.get_json()["report_count"] == 2
    assert other.get_json()["already_reported"] is False

    db_session.expire_all()
    report = db_session.query(ContentReport).filter_by(content_hash=body["content_hash"]).one()
    assert report.report_count == 2
    assert len(report.subscribers) == 2


# --- unsigned reports -----------------------------------------------------------------------


def test_unsigned_content_can_be_reported(client: FlaskClient, reporters, db_session) -> None:
    payload = {"title": "No author stamp anywhere"}
    res = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        json={"content_type": "smash_roster", "payload": payload, "reason": "explicit"},
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["attributed"] is False
    assert body["content_hash"] == compute_content_hash(canonicalize_payload(payload))

    report = db_session.get(ContentReport, body["report_id"])
    assert report.author_id is None
    assert report.evidence_payload == canonicalize_payload(payload)


def test_unsigned_and_signed_reports_of_same_document_share_one_row(
    client: FlaskClient, author, reporters, app
) -> None:
    payload = {"title": "Same document"}
    signed = _signed_body(author, app, payload)
    unsigned = {"content_type": "tier_list", "payload": payload, "reason": "other"}

    assert client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=unsigned).status_code == 201
    res = client.post("/api/v1/content/reports", headers=_headers(reporters[1]), json=signed)
    assert res.status_code == 200
    assert res.get_json()["report_count"] == 2


def test_forged_signature_with_matching_hash_is_rejected(client: FlaskClient, author, reporters, app) -> None:
    body = _signed_body(author, app, {"title": "Forged"})
    body["signature"] = "0" * 64
    res = client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=body)
    assert res.status_code == 400
    assert "signature" in res.get_json()["error"].lower()


def test_partial_author_stamp_is_malformed(client: FlaskClient, author, reporters, app) -> None:
    body = _signed_body(author, app, {"title": "Half a stamp"})
    del body["signature"]
    res = client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=body)
    assert res.status_code == 400


# --- allowlists -----------------------------------------------------------------------------


@pytest.mark.parametrize("reason", ["", "because", "x" * 200, None, 7])
def test_unknown_reason_rejected(client: FlaskClient, reporters, reason) -> None:
    res = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        json={"content_type": "tier_list", "payload": {"title": "t"}, "reason": reason},
    )
    assert res.status_code == 400


@pytest.mark.parametrize("content_type", ["", "perk_build", "TIER_LIST", None])
def test_unknown_content_type_rejected(client: FlaskClient, reporters, content_type) -> None:
    res = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        json={"content_type": content_type, "payload": {"title": "t"}, "reason": "other"},
    )
    assert res.status_code == 400


@pytest.mark.parametrize("content_type", ["tier_list", "smash_roster", "minigame"])
def test_every_supported_content_type_is_reportable(client: FlaskClient, reporters, content_type) -> None:
    res = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        json={"content_type": content_type, "payload": {"title": content_type}, "reason": "illegal"},
    )
    assert res.status_code == 201


def test_non_json_numbers_in_payload_rejected(client: FlaskClient, reporters) -> None:
    res = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        data='{"content_type":"tier_list","reason":"other","payload":{"x":NaN}}',
        content_type="application/json",
    )
    assert res.status_code == 400


# --- document-level revocation check ---------------------------------------------------------


def test_document_revocation_check_ignores_author_stamp(client: FlaskClient, db_session) -> None:
    payload = {"title": "Banned doc", "rounds": [1, 2]}
    content_hash = compute_content_hash(canonicalize_payload(payload))
    db_session.add(ContentRevocation(content_hash=content_hash, content_type="minigame", reason="hate_speech"))
    db_session.commit()

    res = client.post("/api/v1/content/revocations/check-document", json={"payload": payload})
    assert res.status_code == 200
    assert res.get_json() == {"revoked": True, "content_hash": content_hash, "signed": False}

    clean = client.post("/api/v1/content/revocations/check-document", json={"payload": {"title": "fine"}})
    assert clean.get_json()["revoked"] is False


@pytest.mark.parametrize("body", [{}, {"payload": "text"}, {"payload": [1]}, {"payload": None}])
def test_document_revocation_check_validates_body(client: FlaskClient, body) -> None:
    assert client.post("/api/v1/content/revocations/check-document", json=body).status_code == 400


def test_document_revocation_check_rejects_oversized_document(client: FlaskClient) -> None:
    res = client.post("/api/v1/content/revocations/check-document", json={"payload": {"t": "x" * 600_000}})
    assert res.status_code == 400


# --- admin queue + preview ---------------------------------------------------------------------


def test_admin_list_reports_status_counts_and_has_evidence(
    client: FlaskClient, admin, author, reporters, app
) -> None:
    client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=_signed_body(author, app, {"t": 1}))
    res = client.get("/api/v1/admin/content-reports?status=all", headers=_headers(admin))
    assert res.status_code == 200
    data = res.get_json()
    assert data["stats"] == {"dismissed": 0, "expired": 0, "pending": 1, "resolved_banned": 0, "total": 1}
    assert data["items"][0]["has_evidence"] is True
    assert "evidence_payload" not in data["items"][0]


def test_admin_list_rejects_unknown_status(client: FlaskClient, admin) -> None:
    assert client.get("/api/v1/admin/content-reports?status=bogus", headers=_headers(admin)).status_code == 400


def test_admin_preview_lists_every_reporters_reason_without_identities(
    client: FlaskClient, admin, author, reporters, app, db_session
) -> None:
    payload = {"title": "Reviewed"}
    for reporter, reason in zip(reporters, ["hate_speech", "hate_speech", "harassment"]):
        body = _signed_body(author, app, payload, reason=reason)
        body["notes"] = f"note from {reporter.login}"
        client.post("/api/v1/content/reports", headers=_headers(reporter), json=body)

    report_id = db_session.query(ContentReport).one().id
    res = client.get(f"/api/v1/admin/content-reports/{report_id}/preview", headers=_headers(admin))
    assert res.status_code == 200
    data = res.get_json()
    assert data["reason_breakdown"] == {"hate_speech": 2, "harassment": 1}
    assert len(data["reports"]) == 3
    assert {r["notes"] for r in data["reports"]} == {f"note from {r.login}" for r in reporters}
    assert all(set(r) == {"reason", "notes", "created_at"} for r in data["reports"])
    assert data["attributed"] is True
    assert data["author_active"] is True
    assert data["author_standing"] == "active"
    assert data["author_is_admin"] is False
    assert data["evidence_payload"] == canonicalize_payload(payload)


def test_expired_reports_cannot_be_resolved(client: FlaskClient, admin, db_session) -> None:
    report = ContentReport(
        content_type="tier_list",
        content_hash="e" * 64,
        author_login="",
        report_count=1,
        primary_reason="other",
        status="expired",
        evidence_payload=None,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(report)
    db_session.commit()
    res = client.post(
        f"/api/v1/admin/content-reports/{report.id}/resolve",
        headers=_headers(admin),
        json={"action": "ban"},
    )
    assert res.status_code == 409
    assert db_session.scalar(sa.select(ContentRevocation.id)) is None


def test_ban_of_unattributed_report_revokes_hash_only(client: FlaskClient, admin, reporters, db_session) -> None:
    payload = {"title": "Anonymous abuse"}
    created = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporters[0]),
        json={"content_type": "minigame", "payload": payload, "reason": "illegal"},
    ).get_json()
    res = client.post(
        f"/api/v1/admin/content-reports/{created['report_id']}/resolve",
        headers=_headers(admin),
        json={"action": "ban", "ban_author": True},
    )
    assert res.status_code == 200
    db_session.expire_all()
    assert db_session.get(ContentReport, created["report_id"]).evidence_payload is None
    revoked = client.post("/api/v1/content/revocations/check-document", json={"payload": payload})
    assert revoked.get_json()["revoked"] is True


# --- open-report unique index --------------------------------------------------------------------


def _report(content_hash: str, status: str) -> ContentReport:
    return ContentReport(
        content_type="tier_list",
        content_hash=content_hash,
        author_login="",
        report_count=1,
        primary_reason="other",
        status=status,
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
    )


def test_database_allows_only_one_pending_report_per_document(db_session: Session) -> None:
    db_session.add(_report("a" * 64, "pending"))
    db_session.commit()

    db_session.add(_report("a" * 64, "pending"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Resolved history for the same document is fine, and so is a new pending one after resolution.
    db_session.add(_report("a" * 64, "dismissed"))
    db_session.add(_report("b" * 64, "pending"))
    db_session.commit()


def test_concurrent_first_report_joins_the_row_that_won_the_race(
    client: FlaskClient, author, reporters, app, db_session
) -> None:
    """Simulate losing the race: the pending row appears between our lookup and our insert."""
    from app.services import content_moderation_service as svc

    body = _signed_body(author, app, {"title": "Race"})
    real_find = svc._find_pending_report
    calls = {"n": 0}

    def find_then_lose_race(content_hash: str):
        calls["n"] += 1
        if calls["n"] == 1:
            # first lookup (before our insert) sees nothing, then another request inserts the row
            winner = _report(content_hash, "pending")
            winner.author_id = author.id
            winner.author_login = author.login
            db_session.add(winner)
            db_session.flush()
            db_session.add(ContentReportSubscriber(report_id=winner.id, reporter_id=reporters[1].id, reason="other"))
            db_session.commit()
            return None
        return real_find(content_hash)

    with patch.object(svc, "_find_pending_report", side_effect=find_then_lose_race):
        res = client.post("/api/v1/content/reports", headers=_headers(reporters[0]), json=body)

    assert res.status_code == 200
    assert res.get_json()["status"] == "queued"
    db_session.expire_all()
    assert db_session.query(ContentReport).filter_by(content_hash=body["content_hash"]).count() == 1


# --- scheduled purge --------------------------------------------------------------------------------


def test_expired_evidence_purge_is_scheduled_and_wipes_payloads() -> None:
    from app import create_app
    from app.core.config import TestingConfig
    from app.core.extensions import db

    class SchedulerConfig(TestingConfig):
        TESTING = False
        # TESTING is off, so create_app() runs the production key checks: give it real keys.
        SECRET_KEY = JWT_SECRET_KEY = "scheduler-test-" + "k" * 40
        TWO_FACTOR_ENCRYPTION_KEY = ""
        SCHEDULER_ENABLED = True
        SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    with patch("app.BackgroundScheduler") as scheduler_cls:
        scheduler = MagicMock()
        scheduler_cls.return_value = scheduler
        flask_app = create_app(SchedulerConfig)

    jobs = {call.kwargs["id"]: call for call in scheduler.add_job.call_args_list}
    assert "purge_expired_content_evidence" in jobs
    assert "purge_expired_content_evidence_boot" in jobs
    assert jobs["purge_expired_content_evidence"].kwargs["trigger"] == "cron"

    with flask_app.app_context():
        db.create_all()
        db.session.add(
            ContentReport(
                content_type="tier_list",
                content_hash="f" * 64,
                author_login="",
                report_count=1,
                primary_reason="other",
                status="pending",
                evidence_payload='{"toxic":"payload"}',
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            )
        )
        db.session.add(
            ContentReport(
                content_type="tier_list",
                content_hash="9" * 64,
                author_login="",
                report_count=1,
                primary_reason="other",
                status="pending",
                evidence_payload='{"still":"reviewable"}',
                expires_at=datetime.now(timezone.utc) + timedelta(days=3),
            )
        )
        db.session.commit()

        jobs["purge_expired_content_evidence"].args[0]()  # the scheduled callable itself

        db.session.expire_all()
        expired = db.session.query(ContentReport).filter_by(content_hash="f" * 64).one()
        live = db.session.query(ContentReport).filter_by(content_hash="9" * 64).one()
        assert expired.evidence_payload is None and expired.status == "expired"
        assert live.evidence_payload is not None and live.status == "pending"
