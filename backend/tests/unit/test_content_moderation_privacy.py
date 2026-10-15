# backend/tests/unit/test_content_moderation_privacy.py
"""What the Privacy Policy and Terms promise about moderation: the author is told why content was
blocked, a deleted account leaves no username behind in moderation records, and the account
download includes the moderation records about the user."""
import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.core.extensions import mail
from app.core.security import generate_token
from app.models.content_moderation import ContentReport, ContentReportSubscriber, ContentRevocation
from app.models.user import User
from app.services.content_crypto import canonicalize_payload, compute_content_hash, sign_content
from app.services.user.admin import admin_remove_user
from app.services.user.data_export import export_user_data


@pytest.fixture(autouse=True)
def _mail_sender(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")


def _user(db_session: Session, login: str, role: str = "user") -> User:
    user = User(login=login, username=login.title(), email=f"{login}@example.com", password_hash="x", role=role)
    db_session.add(user)
    db_session.commit()
    return user


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


def _report_and_ban(client: FlaskClient, app: Flask, author: User, reporter: User, admin: User, *, ban_author: bool) -> int:
    payload = {"title": "Something rule-breaking"}
    content_hash = compute_content_hash(canonicalize_payload(payload))
    created = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporter),
        json={
            "content_type": "tier_list",
            "content_hash": content_hash,
            "author_id": author.id,
            "author_login": author.login,
            "signature": sign_content(author.id, content_hash, app.config["SECRET_KEY"]),
            "payload": payload,
            "reason": "hate_speech",
            "notes": "private reporter note",
        },
    )
    assert created.status_code == 201
    report_id = created.get_json()["report_id"]
    res = client.post(
        f"/api/v1/admin/content-reports/{report_id}/resolve",
        headers=_headers(admin),
        json={"action": "ban", "ban_author": ban_author, "admin_notes": "private admin note"},
    )
    assert res.status_code == 200
    return report_id


def test_author_gets_a_statement_of_reasons_when_content_is_banned(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author"), _user(db_session, "pv_rep"), _user(db_session, "pv_admin", "admin")
    with mail.record_messages() as outbox:
        _report_and_ban(client, app, author, reporter, admin, ban_author=False)
    assert len(outbox) == 1
    mail_out = outbox[0]
    assert mail_out.recipients == [author.email]
    assert "tier list" in mail_out.subject
    assert "hate speech" in mail_out.body
    assert "deactivated" not in mail_out.body
    # Neither who reported nor what the admin wrote privately may leak into the notice.
    assert "private reporter note" not in mail_out.body
    assert "private admin note" not in mail_out.body
    assert reporter.login not in mail_out.body and admin.login not in mail_out.body


def test_notice_says_when_the_account_was_deactivated(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author2"), _user(db_session, "pv_rep2"), _user(db_session, "pv_admin2", "admin")
    with mail.record_messages() as outbox:
        _report_and_ban(client, app, author, reporter, admin, ban_author=True)
    assert len(outbox) == 1
    # The account decision and the blocked content go out as one statement of reasons.
    assert "permanently banned" in outbox[0].body
    assert "tier list" in outbox[0].body
    assert "private admin note" not in outbox[0].body


def test_dismissing_a_report_sends_no_notice(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author3"), _user(db_session, "pv_rep3"), _user(db_session, "pv_admin3", "admin")
    payload = {"title": "Fine content"}
    content_hash = compute_content_hash(canonicalize_payload(payload))
    created = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporter),
        json={"content_type": "tier_list", "payload": payload, "reason": "other"},
    )
    assert created.status_code == 201, content_hash
    with mail.record_messages() as outbox:
        res = client.post(
            f"/api/v1/admin/content-reports/{created.get_json()['report_id']}/resolve",
            headers=_headers(admin),
            json={"action": "dismiss"},
        )
    assert res.status_code == 200
    assert outbox == []


def test_unattributed_ban_notifies_nobody(client, app, db_session) -> None:
    reporter, admin = _user(db_session, "pv_rep4"), _user(db_session, "pv_admin4", "admin")
    created = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporter),
        json={"content_type": "minigame", "payload": {"title": "No stamp"}, "reason": "illegal"},
    )
    with mail.record_messages() as outbox:
        client.post(
            f"/api/v1/admin/content-reports/{created.get_json()['report_id']}/resolve",
            headers=_headers(admin),
            json={"action": "ban"},
        )
    assert outbox == []


def test_a_failing_mail_server_never_blocks_the_ban(client, app, db_session, monkeypatch) -> None:
    author, reporter, admin = _user(db_session, "pv_author5"), _user(db_session, "pv_rep5"), _user(db_session, "pv_admin5", "admin")

    def boom(*_a, **_k):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(mail, "send", boom)
    _report_and_ban(client, app, author, reporter, admin, ban_author=False)
    assert db_session.query(ContentRevocation).count() == 1


def test_deleting_an_account_removes_its_username_from_moderation_records(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author6"), _user(db_session, "pv_rep6"), _user(db_session, "pv_admin6", "admin")
    report_id = _report_and_ban(client, app, author, reporter, admin, ban_author=False)
    assert db_session.get(ContentReport, report_id).author_login == author.login

    assert admin_remove_user(author.id) is True
    db_session.expire_all()
    report = db_session.get(ContentReport, report_id)
    assert report.author_login == "Deleted user"
    assert db_session.query(ContentRevocation).count() == 1, "the ban list keeps working after the author leaves"


def test_deleting_a_reporter_erases_their_note_but_keeps_the_report(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author7"), _user(db_session, "pv_rep7"), _user(db_session, "pv_admin7", "admin")
    payload = {"title": "Pending one"}
    created = client.post(
        "/api/v1/content/reports",
        headers=_headers(reporter),
        json={"content_type": "tier_list", "payload": payload, "reason": "other", "notes": "my note"},
    )
    report_id = created.get_json()["report_id"]
    assert admin_remove_user(reporter.id) is True
    db_session.expire_all()
    assert db_session.get(ContentReport, report_id) is not None
    subscriber = db_session.query(ContentReportSubscriber).filter_by(report_id=report_id).one()
    assert subscriber.notes is None
    assert subscriber.reason == "other"


def test_account_export_includes_moderation_records_without_other_peoples_identities(client, app, db_session) -> None:
    author, reporter, admin = _user(db_session, "pv_author8"), _user(db_session, "pv_rep8"), _user(db_session, "pv_admin8", "admin")
    _report_and_ban(client, app, author, reporter, admin, ban_author=False)

    mine = export_user_data(author.id)["content_moderation"]
    assert mine["reports_you_filed"] == []
    assert [r["status"] for r in mine["reports_about_your_content"]] == ["resolved_banned"]
    assert mine["reports_about_your_content"][0]["primary_reason"] == "hate_speech"
    assert [r["content_type"] for r in mine["content_blocked"]] == ["tier_list"]
    assert "evidence_payload" not in mine["reports_about_your_content"][0]
    assert reporter.login not in str(mine) and "first_reporter_id" not in str(mine)

    theirs = export_user_data(reporter.id)["content_moderation"]
    assert theirs["reports_you_filed"][0]["notes"] == "private reporter note"
    assert theirs["reports_you_filed"][0]["reason"] == "hate_speech"
    assert theirs["reports_about_your_content"] == []
