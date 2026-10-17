# backend/tests/unit/test_moderation_actions.py
"""Warnings, suspensions and bans: the sanctions are the source of truth, `is_active` /
`suspended_until` are derived, sessions end only for suspend/ban, and sign-in tells a blocked
account why once it has proven who it is."""
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.account_state import as_utc, block_kind
from app.core.extensions import mail
from app.core.security import generate_token, hash_password
from app.models import SanctionNotification, UserSanction
from app.models.admin import AdminAuditLog
from app.models.user import User
from app.services import moderation_actions as actions
from app.services import site_settings
from app.services.moderation_actions import ModerationError

PASSWORD = "correct-horse-1"


@pytest.fixture(autouse=True)
def _mail_sender(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")


def _user(db_session: Session, login: str, role: str = "user", language: str | None = None) -> User:
    user = User(
        login=login,
        username=login.title(),
        email=f"{login}@example.com",
        password_hash=hash_password(PASSWORD),
        role=role,
        preferred_language=language,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


def _login(client: FlaskClient, user: User, password: str = PASSWORD):
    return client.post("/api/v1/auth/login", json={"login": user.login, "password": password})


FACTS = "Posted a tier list with slurs."


@pytest.fixture
def admin(db_session: Session) -> User:
    return _user(db_session, "mod_admin", "admin")


@pytest.fixture
def player(db_session: Session) -> User:
    return _user(db_session, "mod_player")


# --- state -----------------------------------------------------------------------------------


def test_warning_does_not_restrict_or_end_sessions(admin, player, db_session) -> None:
    version = player.token_version
    with mail.record_messages() as outbox:
        sanction = actions.issue_warning(admin, player.id, reason_code="spam")
    db_session.refresh(player)
    assert player.is_active is True and player.suspended_until is None
    assert player.token_version == version
    assert sanction.kind == "warning" and sanction.facts is None
    assert as_utc(sanction.expires_at) > datetime.now(timezone.utc) + timedelta(days=80)
    assert len(outbox) == 1 and outbox[0].recipients == [player.email]


def test_warning_lifetime_comes_from_the_setting(admin, player) -> None:
    site_settings.update_settings({"warning_lifetime_days": 10})
    sanction = actions.issue_warning(admin, player.id, reason_code="spam")
    left = as_utc(sanction.expires_at) - datetime.now(timezone.utc)
    assert timedelta(days=9) < left <= timedelta(days=10)


def test_suspension_sets_the_end_date_and_ends_sessions(admin, player, db_session) -> None:
    version = player.token_version
    actions.suspend(admin, player.id, reason_code="harassment", facts=FACTS, duration_days=7)
    db_session.refresh(player)
    assert player.is_active is True
    assert block_kind(player) == "suspended"
    assert as_utc(player.suspended_until) > datetime.now(timezone.utc) + timedelta(days=6)
    assert player.token_version == version + 1


def test_longest_suspension_wins_and_a_shorter_one_never_shortens_it(admin, player, db_session) -> None:
    actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=30)
    long_end = as_utc(db_session.refresh(player) or player.suspended_until)
    actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=3)
    db_session.refresh(player)
    assert as_utc(player.suspended_until) == long_end


def test_an_expired_suspension_no_longer_blocks_without_any_write(admin, player, db_session) -> None:
    sanction = actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=1)
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    sanction.expires_at = past
    player.suspended_until = past
    db_session.commit()
    assert block_kind(player) is None
    assert actions.active_sanctions(player.id, kind="suspension") == []


def test_ban_deactivates_and_a_second_ban_is_refused(admin, player, db_session) -> None:
    actions.ban(admin, player.id, reason_code="illegal", facts=FACTS)
    db_session.refresh(player)
    assert player.is_active is False and player.suspended_until is None
    with pytest.raises(ModerationError) as err:
        actions.ban(admin, player.id, reason_code="illegal", facts=FACTS)
    assert err.value.status == 409
    with pytest.raises(ModerationError) as err:
        actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=2)
    assert err.value.status == 409


def test_revoking_a_ban_reactivates_and_emails(admin, player, db_session) -> None:
    ban = actions.ban(admin, player.id, reason_code="illegal", facts=FACTS)
    with mail.record_messages() as outbox:
        actions.revoke_sanction(admin, ban.id, "Mistake, sorry.")
    db_session.refresh(player)
    assert player.is_active is True and block_kind(player) is None
    assert len(outbox) == 1 and "lifted" in outbox[0].subject
    with pytest.raises(ModerationError) as err:
        actions.revoke_sanction(admin, ban.id, "again")
    assert err.value.status == 409


def test_revoking_needs_a_reason_and_a_warning_changes_no_state(admin, player, db_session) -> None:
    warning = actions.issue_warning(admin, player.id, reason_code="spam")
    with pytest.raises(ModerationError):
        actions.revoke_sanction(admin, warning.id, "  ")
    with mail.record_messages() as outbox:
        actions.revoke_sanction(admin, warning.id, "Not deserved.")
    assert outbox == []
    assert actions.pending_warnings(player.id) == []


def test_restore_lifts_everything_and_fixes_a_legacy_disabled_account(admin, player, db_session) -> None:
    actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=5)
    assert actions.restore_account(admin, player.id, "Appeal accepted.") == 1
    db_session.refresh(player)
    assert block_kind(player) is None
    # disabled before sanctions existed: no sanction row, just the flag
    legacy = _user(db_session, "legacy_off")
    legacy.is_active = False
    db_session.commit()
    assert actions.restore_account(admin, legacy.id, "Re-enabled.") == 0
    db_session.refresh(legacy)
    assert legacy.is_active is True


def test_admins_and_yourself_cannot_be_sanctioned(admin, db_session) -> None:
    other_admin = _user(db_session, "other_admin", "admin")
    with pytest.raises(ModerationError):
        actions.ban(admin, other_admin.id, reason_code="spam", facts=FACTS)
    with pytest.raises(ModerationError):
        actions.issue_warning(admin, admin.id, reason_code="spam")


@pytest.mark.parametrize(
    "kind, fields",
    [
        ("suspension", {"reason_code": "spam", "duration_days": 3}),  # facts missing
        ("ban", {"reason_code": "spam"}),  # facts missing
        ("suspension", {"reason_code": "spam", "facts": FACTS, "duration_days": 0}),
        ("suspension", {"reason_code": "spam", "facts": FACTS, "duration_days": 400}),
        ("suspension", {"reason_code": "spam", "facts": FACTS, "duration_days": True}),
        ("warning", {"reason_code": "not-a-reason"}),
        ("warning", {"reason_code": "spam", "rule_ref": "nope"}),
    ],
)
def test_invalid_requests_are_refused(admin, player, kind, fields) -> None:
    with pytest.raises(ModerationError) as err:
        actions._issue(kind, admin, player.id, **fields)
    assert err.value.status == 400


def test_database_forbids_a_ban_together_with_a_suspension(player, db_session) -> None:
    player.is_active = False
    player.suspended_until = datetime.now(timezone.utc) + timedelta(days=1)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_decisions_are_audited_without_the_internal_notes(admin, player, db_session) -> None:
    actions.ban(admin, player.id, reason_code="spam", facts=FACTS, internal_notes="secret thoughts")
    rows = db_session.scalars(select(AdminAuditLog).where(AdminAuditLog.action == "user_banned")).all()
    assert len(rows) == 1 and rows[0].admin_user_id == admin.id
    assert "secret thoughts" not in (rows[0].details or "")


# --- sign-in ---------------------------------------------------------------------------------


def test_preview_shows_the_email_in_the_users_language_and_saves_nothing(admin, db_session) -> None:
    polish = _user(db_session, "polish", language="pl")
    with mail.record_messages() as outbox:
        preview = actions.preview_sanction(
            {"user_id": polish.id, "kind": "suspension", "reason_code": "harassment", "rule_ref": "respect", "facts": FACTS, "duration_days": 3}
        )
    assert preview["language"] == "pl" and preview["facts"] == FACTS and preview["until"]
    email = preview["email"]
    flat = " ".join(" ".join(block[1:]) for block in email["blocks"])
    assert email["subject"] and FACTS in flat and "Sekcja 2: " in flat
    assert db_session.scalar(select(UserSanction)) is None and db_session.scalar(select(SanctionNotification)) is None
    assert outbox == []


def test_preview_refuses_what_the_decision_would_refuse(admin, player) -> None:
    for body, status in (
        ({"user_id": player.id, "kind": "nap", "reason_code": "spam"}, 400),
        ({"user_id": player.id, "kind": "warning", "reason_code": "nope"}, 400),
        ({"user_id": player.id, "kind": "warning", "reason_code": "spam", "rule_ref": "nope"}, 400),
        ({"user_id": player.id, "kind": "suspension", "reason_code": "spam", "duration_days": 0}, 400),
        ({"user_id": 999999, "kind": "warning", "reason_code": "spam"}, 404),
    ):
        with pytest.raises(ModerationError) as err:
            actions.preview_sanction(body)
        assert err.value.status == status


def test_banned_user_with_the_right_password_is_told_why(client, admin, player) -> None:
    site_settings.update_settings({"contact_email": "help@lemondbd.test"})
    actions.ban(admin, player.id, reason_code="harassment", facts=FACTS)
    res = _login(client, player)
    body = res.get_json()
    assert res.status_code == 403
    assert body["code"] == "account_banned"
    assert body["reason_code"] == "harassment" and "public_message" not in body
    assert body["appeal_contact"] == "help@lemondbd.test" and body["until"] is None


def test_a_wrong_password_never_reveals_the_block(client, admin, player) -> None:
    actions.ban(admin, player.id, reason_code="spam", facts=FACTS)
    res = _login(client, player, "wrong-password")
    assert res.status_code == 401 and "code" not in res.get_json()


def test_suspended_user_is_told_until_when_then_can_sign_in_again(client, admin, player, db_session) -> None:
    sanction = actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=2)
    res = _login(client, player)
    assert res.status_code == 403 and res.get_json()["code"] == "account_suspended"
    assert res.get_json()["until"] is not None
    past = datetime.now(timezone.utc) - timedelta(minutes=1)
    sanction.expires_at = past
    player.suspended_until = past
    db_session.commit()
    assert _login(client, player).status_code == 200


def test_existing_sessions_end_on_suspension_but_not_on_a_warning(client, admin, player) -> None:
    headers = _headers(player)
    assert client.get("/api/v1/auth/me", headers=headers).get_json()["authenticated"] is True
    actions.issue_warning(admin, player.id, reason_code="spam")
    assert client.get("/api/v1/auth/me", headers=headers).get_json()["authenticated"] is True
    actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=1)
    assert client.get("/api/v1/auth/me", headers=headers).get_json()["authenticated"] is False


def test_warnings_show_on_me_until_acknowledged(client, admin, player) -> None:
    warning = actions.issue_warning(admin, player.id, reason_code="spam", internal_notes="x")
    me = client.get("/api/v1/auth/me", headers=_headers(player)).get_json()
    shown = me["moderation"]["warnings"]
    assert [w["id"] for w in shown] == [warning.id]
    assert "internal_notes" not in shown[0] and "issued_by_id" not in shown[0] and "report_id" not in shown[0]
    assert client.post(f"/api/v1/auth/sanctions/{warning.id}/acknowledge", headers=_headers(player)).status_code == 200
    assert client.get("/api/v1/auth/me", headers=_headers(player)).get_json()["moderation"]["warnings"] == []


def test_sign_in_answers_with_the_pending_warnings(client, admin, player) -> None:
    warning = actions.issue_warning(admin, player.id, reason_code="spam")
    body = _login(client, player).get_json()
    assert [w["id"] for w in body["moderation"]["warnings"]] == [warning.id]
    assert "internal_notes" not in body["moderation"]["warnings"][0]


def test_nobody_can_acknowledge_someone_elses_warning(client, admin, player, db_session) -> None:
    other = _user(db_session, "mod_other")
    warning = actions.issue_warning(admin, player.id, reason_code="spam")
    assert client.post(f"/api/v1/auth/sanctions/{warning.id}/acknowledge", headers=_headers(other)).status_code == 404


# --- admin API -------------------------------------------------------------------------------


def test_admin_api_issues_lists_and_revokes(client, admin, player) -> None:
    url = f"/api/v1/admin/users/{player.id}/sanctions"
    created = client.post(
        url, headers=_headers(admin), json={"kind": "suspension", "reason_code": "spam", "facts": FACTS, "duration_days": 4}
    )
    assert created.status_code == 201
    sanction_id = created.get_json()["sanction"]["id"]
    listing = client.get(url, headers=_headers(admin)).get_json()
    assert listing["sanctions"][0]["active"] is True and listing["sanctions"][0]["issued_by_login"] == admin.login
    assert listing["summary"]["suspended_until"] is not None
    revoked = client.post(f"/api/v1/admin/sanctions/{sanction_id}/revoke", headers=_headers(admin), json={"reason": "ok"})
    assert revoked.status_code == 200
    assert client.get(url, headers=_headers(admin)).get_json()["summary"]["suspended_until"] is None


def test_admin_api_rejects_non_admins_and_bad_bodies(client, admin, player) -> None:
    url = f"/api/v1/admin/users/{player.id}/sanctions"
    assert client.post(url, headers=_headers(player), json={"kind": "warning", "reason_code": "spam"}).status_code == 403
    assert client.post(url, headers=_headers(admin), json={"kind": "mute", "reason_code": "spam"}).status_code == 400
    assert client.post(url, headers=_headers(admin), json={"kind": "ban", "reason_code": "spam"}).status_code == 400
    assert client.post("/api/v1/admin/users/99999/sanctions", headers=_headers(admin), json={"kind": "warning", "reason_code": "spam"}).status_code == 404
    assert client.post(f"/api/v1/admin/users/{player.id}/restore", headers=_headers(admin), json={}).status_code == 400


def test_the_old_enable_disable_switch_now_records_a_ban_and_tells_the_user(client, admin, player, db_session) -> None:
    with mail.record_messages() as outbox:
        res = client.put(f"/api/v1/users/{player.id}", headers=_headers(admin), json={"is_active": False})
    assert res.status_code == 200
    db_session.refresh(player)
    assert player.is_active is False
    sanction = db_session.scalar(select(UserSanction).where(UserSanction.user_id == player.id))
    assert sanction.kind == "ban" and sanction.issued_by_id == admin.id
    assert len(outbox) == 1
    assert client.put(f"/api/v1/users/{player.id}", headers=_headers(admin), json={"is_active": True}).status_code == 200
    db_session.refresh(player)
    assert player.is_active is True
    assert db_session.scalar(select(UserSanction).where(UserSanction.user_id == player.id)).revoked_at is not None


# --- report resolution -----------------------------------------------------------------------


def _report(db_session: Session, author: User) -> int:
    from app.models.content_moderation import ContentReport

    report = ContentReport(
        content_type="minigame",
        content_hash="c" * 64,
        author_id=author.id,
        author_login=author.login,
        primary_reason="harassment",
        status="pending",
        evidence_payload="{}",
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db_session.add(report)
    db_session.commit()
    return report.id


@pytest.mark.parametrize("author_action, kind", [("warn", "warning"), ("suspend", "suspension"), ("ban", "ban")])
def test_resolving_a_report_can_sanction_the_author_with_one_merged_email(
    client, admin, player, db_session, author_action, kind
) -> None:
    report_id = _report(db_session, player)
    with mail.record_messages() as outbox:
        res = client.post(
            f"/api/v1/admin/content-reports/{report_id}/resolve",
            headers=_headers(admin),
            json={"action": "ban", "author_action": author_action, "duration_days": 5, "admin_notes": "private"},
        )
    assert res.status_code == 200, res.get_json()
    sanction = db_session.scalar(select(UserSanction).where(UserSanction.user_id == player.id))
    assert sanction.kind == kind and sanction.source == "content_report" and sanction.report_id == report_id
    assert sanction.reason_code == "harassment"
    assert len(outbox) == 1
    assert "minigame" in outbox[0].body and "human review" in outbox[0].body
    assert "private" not in outbox[0].body


def test_resolving_without_an_author_action_keeps_the_plain_content_notice(client, admin, player, db_session) -> None:
    report_id = _report(db_session, player)
    with mail.record_messages() as outbox:
        res = client.post(
            f"/api/v1/admin/content-reports/{report_id}/resolve", headers=_headers(admin), json={"action": "ban"}
        )
    assert res.status_code == 200
    assert db_session.scalars(select(UserSanction)).all() == []
    assert len(outbox) == 1 and "was blocked" in outbox[0].subject


def test_a_refused_author_action_rolls_the_whole_resolution_back(client, admin, player, db_session) -> None:
    report_id = _report(db_session, player)
    res = client.post(
        f"/api/v1/admin/content-reports/{report_id}/resolve",
        headers=_headers(admin),
        json={"action": "ban", "author_action": "suspend", "duration_days": 0},
    )
    assert res.status_code == 400
    from app.models.content_moderation import ContentReport, ContentRevocation

    assert db_session.get(ContentReport, report_id).status == "pending"
    assert db_session.scalars(select(ContentRevocation)).all() == []
    assert db_session.scalars(select(SanctionNotification)).all() == []
