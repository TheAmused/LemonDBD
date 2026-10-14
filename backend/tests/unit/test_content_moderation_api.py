# backend/tests/unit/test_content_moderation_api.py
import pytest
from datetime import datetime, timezone, timedelta
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.core.security import generate_token
from app.models.content_moderation import ContentReport, ContentReportSubscriber, ContentRevocation
from app.models.user import User
from app.services.content_crypto import canonicalize_payload, compute_content_hash, sign_content


def _auth_headers(user: User) -> dict[str, str]:
    token = generate_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def author_user(db_session: Session) -> User:
    user = User(
        login="author_user",
        username="Author User",
        email="author@example.com",
        password_hash="hashed_pw_author",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def reporter_user(db_session: Session) -> User:
    user = User(
        login="reporter_user",
        username="Reporter User",
        email="reporter@example.com",
        password_hash="hashed_pw_reporter",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def second_reporter_user(db_session: Session) -> User:
    user = User(
        login="second_reporter",
        username="Second Reporter",
        email="second_reporter@example.com",
        password_hash="hashed_pw_reporter_2",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_sign_content_authenticated(client: FlaskClient, author_user: User, app) -> None:
    headers = _auth_headers(author_user)
    payload = {"title": "Best Survivor Perks", "tiers": {"S": [1, 2], "A": [3, 4]}}

    res = client.post(
        "/api/v1/content/sign",
        headers=headers,
        json={"content_type": "tier_list", "payload": payload},
    )

    assert res.status_code == 200
    data = res.get_json()
    assert data["content_type"] == "tier_list"
    assert data["author_id"] == author_user.id
    assert data["author_login"] == author_user.login
    assert len(data["content_hash"]) == 64
    assert len(data["signature"]) == 64
    assert "created_at" in data

    # Verify signature matches cryptographic generation
    expected_canon = canonicalize_payload(payload)
    expected_hash = compute_content_hash(expected_canon)
    expected_sig = sign_content(author_user.id, expected_hash, app.config["SECRET_KEY"])
    assert data["content_hash"] == expected_hash
    assert data["signature"] == expected_sig


def test_sign_content_unauthenticated_rejected(client: FlaskClient) -> None:
    res = client.post(
        "/api/v1/content/sign",
        json={"content_type": "tier_list", "payload": {"title": "Test"}},
    )
    assert res.status_code == 401


def test_sign_content_invalid_payload_rejected(client: FlaskClient, author_user: User) -> None:
    headers = _auth_headers(author_user)

    # Missing payload
    res1 = client.post(
        "/api/v1/content/sign",
        headers=headers,
        json={"content_type": "tier_list"},
    )
    assert res1.status_code == 400

    # Payload not a dict
    res2 = client.post(
        "/api/v1/content/sign",
        headers=headers,
        json={"content_type": "tier_list", "payload": "not-a-dict"},
    )
    assert res2.status_code == 400

    # Missing content_type
    res3 = client.post(
        "/api/v1/content/sign",
        headers=headers,
        json={"payload": {"foo": "bar"}},
    )
    assert res3.status_code == 400


def test_create_report_authenticated_success(
    client: FlaskClient, author_user: User, reporter_user: User, app, db_session: Session
) -> None:
    payload = {"title": "Toxic Build", "description": "Offensive content here"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    signature = sign_content(author_user.id, content_hash, app.config["SECRET_KEY"])

    headers = _auth_headers(reporter_user)
    report_data = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": signature,
        "payload": payload,
        "reason": "hate_speech",
        "notes": "Please remove immediately",
    }

    res = client.post("/api/v1/content/reports", headers=headers, json=report_data)
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "pending"
    assert data["message"] == "Report created successfully"
    assert data["content_hash"] == content_hash
    assert "report_id" in data

    # Check database persistence
    report = db_session.get(ContentReport, data["report_id"])
    assert report is not None
    assert report.content_hash == content_hash
    assert report.content_type == "tier_list"
    assert report.author_id == author_user.id
    assert report.author_login == author_user.login
    assert report.first_reporter_id == reporter_user.id
    assert report.report_count == 1
    assert report.primary_reason == "hate_speech"
    assert report.status == "pending"
    assert report.evidence_payload == canon
    assert len(report.subscribers) == 1
    assert report.subscribers[0].reporter_id == reporter_user.id
    assert report.subscribers[0].reason == "hate_speech"
    assert report.subscribers[0].notes == "Please remove immediately"


def test_create_report_unauthenticated_rejected(client: FlaskClient) -> None:
    res = client.post(
        "/api/v1/content/reports",
        json={"content_type": "tier_list", "content_hash": "a" * 64},
    )
    assert res.status_code == 401


def test_create_report_payload_mismatch_rejected(
    client: FlaskClient, author_user: User, reporter_user: User, app
) -> None:
    payload = {"title": "Legit Content"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    signature = sign_content(author_user.id, content_hash, app.config["SECRET_KEY"])

    headers = _auth_headers(reporter_user)
    # Provide tampered payload that does not match content_hash
    tampered_payload = {"title": "Tampered Content"}
    report_data = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": signature,
        "payload": tampered_payload,
        "reason": "spam",
    }

    res = client.post("/api/v1/content/reports", headers=headers, json=report_data)
    assert res.status_code == 400
    assert "mismatch" in res.get_json().get("error", "").lower()


def test_create_report_invalid_signature_rejected(
    client: FlaskClient, author_user: User, reporter_user: User
) -> None:
    payload = {"title": "Legit Content"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    invalid_signature = "0" * 64

    headers = _auth_headers(reporter_user)
    report_data = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": invalid_signature,
        "payload": payload,
        "reason": "harassment",
    }

    res = client.post("/api/v1/content/reports", headers=headers, json=report_data)
    assert res.status_code == 400
    assert "signature" in res.get_json().get("error", "").lower()


def test_create_report_deduplication_bumps_count_and_adds_subscriber(
    client: FlaskClient,
    author_user: User,
    reporter_user: User,
    second_reporter_user: User,
    app,
    db_session: Session,
) -> None:
    payload = {"title": "Duplicate Report Content"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    signature = sign_content(author_user.id, content_hash, app.config["SECRET_KEY"])

    headers1 = _auth_headers(reporter_user)
    report_data1 = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": signature,
        "payload": payload,
        "reason": "spam",
        "notes": "First report note",
    }

    # First report creates pending report
    res1 = client.post("/api/v1/content/reports", headers=headers1, json=report_data1)
    assert res1.status_code == 201
    assert res1.get_json()["status"] == "pending"

    # Second report from different user bumps count to 2 and adds subscriber
    headers2 = _auth_headers(second_reporter_user)
    report_data2 = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": signature,
        "payload": payload,
        "reason": "harassment",
        "notes": "Second report note",
    }

    res2 = client.post("/api/v1/content/reports", headers=headers2, json=report_data2)
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["status"] == "queued"
    assert data2["report_count"] == 2
    assert data2["content_hash"] == content_hash

    # Third report from original reporter: bumps count, avoids duplicate subscriber crash
    res3 = client.post("/api/v1/content/reports", headers=headers1, json=report_data1)
    assert res3.status_code == 200
    data3 = res3.get_json()
    assert data3["status"] == "queued"
    assert data3["report_count"] == 3

    # Check database state
    report = db_session.query(ContentReport).filter_by(content_hash=content_hash).first()
    assert report is not None
    assert report.report_count == 3
    # Only 2 distinct subscribers should exist (reporter_user and second_reporter_user)
    assert len(report.subscribers) == 2


def test_create_report_already_banned_revoked_content(
    client: FlaskClient, author_user: User, reporter_user: User, app, db_session: Session
) -> None:
    payload = {"title": "Banned Content"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    signature = sign_content(author_user.id, content_hash, app.config["SECRET_KEY"])

    # Insert existing revocation record
    revocation = ContentRevocation(
        content_hash=content_hash,
        content_type="tier_list",
        author_id=author_user.id,
        reason="previously_banned",
    )
    db_session.add(revocation)
    db_session.commit()

    headers = _auth_headers(reporter_user)
    report_data = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_user.id,
        "author_login": author_user.login,
        "signature": signature,
        "payload": payload,
        "reason": "hate_speech",
    }

    res = client.post("/api/v1/content/reports", headers=headers, json=report_data)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "already_banned"
    assert data["content_hash"] == content_hash
    assert "revoked and blocked" in data["message"]

    # Verify no new report was added
    report = db_session.query(ContentReport).filter_by(content_hash=content_hash).first()
    assert report is None


def test_revocations_check_public_and_validations(
    client: FlaskClient, db_session: Session
) -> None:
    hash_revoked_1 = "1" * 64
    hash_revoked_2 = "2" * 64
    hash_active = "3" * 64

    rev1 = ContentRevocation(
        content_hash=hash_revoked_1, content_type="tier_list", reason="banned_1"
    )
    rev2 = ContentRevocation(
        content_hash=hash_revoked_2, content_type="tier_list", reason="banned_2"
    )
    db_session.add_all([rev1, rev2])
    db_session.commit()

    # Query with mix of revoked and active hashes
    res = client.post(
        "/api/v1/content/revocations/check",
        json={"hashes": [hash_revoked_1, hash_active, hash_revoked_2]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert set(data["revoked_hashes"]) == {hash_revoked_1, hash_revoked_2}

    # Query with empty list
    res_empty = client.post(
        "/api/v1/content/revocations/check",
        json={"hashes": []},
    )
    assert res_empty.status_code == 200
    assert res_empty.get_json()["revoked_hashes"] == []

    # Invalid hashes format (not a list)
    res_invalid_type = client.post(
        "/api/v1/content/revocations/check",
        json={"hashes": "not-a-list"},
    )
    assert res_invalid_type.status_code == 400

    # Invalid hash item (wrong length)
    res_invalid_item = client.post(
        "/api/v1/content/revocations/check",
        json={"hashes": ["too_short"]},
    )
    assert res_invalid_item.status_code == 400
