# backend/tests/unit/test_sanction_outbox.py
"""The moderation email outbox: claim-based delivery, retries, skip rules, "ended" notices, and the
texts themselves (every language, every event, nothing internal)."""
import re
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db, mail
from app.core.security import hash_password
from app.models import SanctionNotification, UserSanction
from app.models.user import User
from app.services import moderation_actions as actions
from app.services import sanction_outbox as outbox
from app.services.sanction_email_texts import SUPPORTED, build_sanction_email, texts_for
from app.services.sanction_outbox import deliver_notification

FACTS = "Posted a tier list with slurs."


@pytest.fixture(autouse=True)
def _mail_sender(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")


def _user(db_session: Session, login: str, role: str = "user", language: str | None = None) -> User:
    user = User(
        login=login,
        username=login.title(),
        email=f"{login}@example.com",
        password_hash=hash_password("correct-horse-1"),
        role=role,
        preferred_language=language,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin(db_session: Session) -> User:
    return _user(db_session, "ob_admin", "admin")


@pytest.fixture
def player(db_session: Session) -> User:
    return _user(db_session, "ob_player")


def _queue(admin: User, player: User, kind: str = "suspension", **extra) -> tuple[UserSanction, SanctionNotification]:
    """A sanction whose email is queued but NOT delivered (the outbox is driven by hand)."""
    extra.setdefault("reason_code", "spam")
    if kind != "warning":
        extra.setdefault("facts", FACTS)
    if kind == "suspension":
        extra.setdefault("duration_days", 3)
    with mail.record_messages():
        from app.core.transaction import transaction

        with transaction():
            sanction = actions.create_sanction(kind, admin, player, **extra)
    note = db.session.scalars(select(SanctionNotification).where(SanctionNotification.sanction_id == sanction.id)).one()
    return sanction, note


class _Failing:
    """mail.send replacement that fails a set number of times, then works."""

    def __init__(self, failures: int) -> None:
        self.failures = failures
        self.sent: list = []

    def __call__(self, message) -> None:
        if self.failures > 0:
            self.failures -= 1
            raise ConnectionError("SMTP unavailable")
        self.sent.append(message)


# --- delivery --------------------------------------------------------------------------------


def test_delivery_sends_once_and_marks_the_row(admin, player) -> None:
    _, note = _queue(admin, player)
    with mail.record_messages() as sent:
        assert deliver_notification(note.id) is True
        assert deliver_notification(note.id) is False  # already done: nothing to claim
    assert len(sent) == 1
    db.session.refresh(note)
    assert note.notified_at is not None and note.attempts == 1 and note.in_flight_at is None and note.last_error is None


def test_failed_send_is_recorded_and_retried(admin, player, monkeypatch) -> None:
    _, note = _queue(admin, player)
    failing = _Failing(failures=1)
    monkeypatch.setattr(mail, "send", failing)

    assert deliver_notification(note.id) is False
    db.session.refresh(note)
    assert note.notified_at is None and note.attempts == 1 and note.in_flight_at is None
    assert "SMTP unavailable" in note.last_error

    assert outbox.retry_pending_notifications() == 1  # the scheduler's pass picks it up
    db.session.refresh(note)
    assert note.notified_at is not None and note.attempts == 2 and note.last_error is None
    assert len(failing.sent) == 1


def test_gives_up_after_the_maximum_number_of_attempts(admin, player, monkeypatch) -> None:
    _, note = _queue(admin, player)
    monkeypatch.setattr(mail, "send", _Failing(failures=100))
    for _ in range(outbox.MAX_NOTIFY_ATTEMPTS + 3):
        outbox.retry_pending_notifications()
    db.session.refresh(note)
    assert note.notified_at is None and note.attempts == outbox.MAX_NOTIFY_ATTEMPTS


def test_a_live_claim_blocks_a_second_sender_and_a_stale_one_is_retaken(admin, player) -> None:
    _, note = _queue(admin, player)
    note.in_flight_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.session.commit()
    with mail.record_messages() as sent:
        assert deliver_notification(note.id) is False  # somebody else is sending it right now
        assert sent == []

        note.in_flight_at = datetime.now(timezone.utc) - outbox.STALE_CLAIM - timedelta(minutes=1)
        db.session.commit()
        assert deliver_notification(note.id) is True  # that attempt died: take it over
        assert len(sent) == 1


def test_a_missing_notification_is_ignored() -> None:
    assert deliver_notification(987654) is False


# --- skip rules ------------------------------------------------------------------------------


def test_a_decision_revoked_before_sending_sends_nothing(admin, player) -> None:
    sanction, issued = _queue(admin, player)
    actions.revoke_sanction(admin, sanction.id, "Mistake.")
    with mail.record_messages() as sent:
        assert outbox.retry_pending_notifications() == 0
    assert sent == []
    db.session.refresh(issued)
    assert issued.notified_at is not None and "revoked" in issued.last_error  # closed, not retried forever


def test_lifted_notice_follows_a_sent_notice_but_not_an_unsent_one(admin, player) -> None:
    sanction, issued = _queue(admin, player)
    with mail.record_messages() as sent:
        assert deliver_notification(issued.id) is True
        actions.revoke_sanction(admin, sanction.id, "Appeal accepted.")  # sends the lifted notice itself
        assert outbox.retry_pending_notifications() == 0
    assert len(sent) == 2  # issued, then lifted
    events = {n.event: n for n in db.session.scalars(select(SanctionNotification))}
    assert set(events) == {"issued", "lifted"} and all(n.notified_at for n in events.values())


def test_deleted_account_sends_nothing(admin, player, db_session) -> None:
    _, note = _queue(admin, player)
    db_session.delete(player)  # in production the rows cascade away; here they are left orphaned
    db_session.commit()
    with mail.record_messages() as sent:
        assert deliver_notification(note.id) is False
    assert sent == []
    db_session.refresh(note)
    assert note.notified_at is not None and "no longer exists" in note.last_error


# --- "your suspension has ended" -------------------------------------------------------------


def test_ended_notice_is_queued_once_for_a_notified_suspension(admin, player) -> None:
    sanction, issued = _queue(admin, player)
    with mail.record_messages() as sent:
        deliver_notification(issued.id)
        assert outbox.queue_ended_notifications() == 0  # still running
        sanction.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.session.commit()

        assert outbox.retry_pending_notifications() == 1
        assert outbox.retry_pending_notifications() == 0  # exactly once
    assert len(sent) == 2
    assert "ended" in {n.event for n in db.session.scalars(select(SanctionNotification))}


def test_ended_notice_skips_suspensions_past_the_lookback_and_revoked_ones(admin, player, db_session) -> None:
    recent, _ = _queue(admin, player, duration_days=2)
    recent.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()
    assert outbox.queue_ended_notifications() == 1  # recent and owed an "issued" notice: queued
    ended = db_session.scalars(select(SanctionNotification).where(SanctionNotification.event == "ended")).one()
    db_session.delete(ended)
    db_session.commit()

    long_ago, issued = _queue(admin, _user(db_session, "ob_second"))
    long_ago.expires_at = datetime.now(timezone.utc) - outbox.ENDED_LOOKBACK - timedelta(days=1)
    db_session.commit()
    assert outbox.queue_ended_notifications() == 1  # only the recent one again, never the stale one
    assert db_session.scalars(select(SanctionNotification).where(SanctionNotification.sanction_id == long_ago.id)).all() == [issued]

    revoked, _ = _queue(admin, _user(db_session, "ob_third"))
    revoked.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    revoked.revoked_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.commit()
    assert outbox.queue_ended_notifications() == 0  # a revoked suspension is covered by the lifted notice
    assert "ended" not in {n.event for n in db_session.scalars(select(SanctionNotification).where(SanctionNotification.sanction_id == revoked.id))}


# --- texts -----------------------------------------------------------------------------------


def test_every_language_has_the_same_keys() -> None:
    reference = texts_for("en")
    for language in SUPPORTED:
        texts = texts_for(language)
        assert set(texts) == set(reference), language
        for key, value in reference.items():
            if isinstance(value, dict):
                assert set(texts[key]) == set(value), f"{language}.{key}"


@pytest.mark.parametrize("language", [*SUPPORTED, None, "xx"])
@pytest.mark.parametrize("kind", ["warning", "suspension", "ban"])
def test_issued_email_has_the_statement_of_reasons(language, kind) -> None:
    until = datetime(2026, 12, 1, 8, 30, tzinfo=timezone.utc)
    content = build_sanction_email(
        language,
        event="issued",
        kind=kind,
        username="Ada",
        reason_code="harassment",
        rule_ref="respect",
        facts=FACTS,
        issued_at=datetime(2026, 10, 15, tzinfo=timezone.utc),
        until=until if kind == "suspension" else None,
        from_report=True,
        content_type="tier_list",
        contact="help@lemondbd.test",
        rules_url="https://lemon.test/en/rules",
    )
    flat = " ".join(" ".join(block[1:]) for block in content.blocks)
    assert "Ada" in flat and FACTS in flat
    assert "help@lemondbd.test" in flat and "https://lemon.test/en/rules" in flat
    if kind == "suspension":
        assert "2026-12-01" in flat
    assert content.subject and content.preheader and content.footer
    assert "{" not in flat and "}" not in flat  # no unfilled placeholder
    rule_field = next(block for block in content.blocks if block[0] == "field" and block[1] == texts_for(language)["rule_label"])
    assert re.match(r"(Section|Sekcja|Abschnitt|Sección|第) ?1", rule_field[2])  # respect is section 1 of the Rules page


@pytest.mark.parametrize("language", SUPPORTED)
def test_redress_is_for_restrictions_only(language) -> None:
    redress = texts_for(language)["redress"]

    def flat(kind: str, content_type: str | None = None) -> str:
        content = build_sanction_email(
            language, event="issued", kind=kind, username="Ada", reason_code="spam", content_type=content_type
        )
        return " ".join(" ".join(block[1:]) for block in content.blocks)

    assert redress not in flat("warning")
    assert redress in flat("warning", "tier_list")  # the content was removed, which is a restriction
    assert redress in flat("suspension") and redress in flat("ban")


@pytest.mark.parametrize("language", SUPPORTED)
@pytest.mark.parametrize("event", ["lifted", "ended"])
def test_follow_up_emails_exist_in_every_language(language, event) -> None:
    content = build_sanction_email(
        language, event=event, kind="suspension", username="Ada", reason_code="spam", issued_at=datetime(2026, 10, 15, tzinfo=timezone.utc)
    )
    assert content.subject and len(content.blocks) == 2
    assert "{" not in " ".join(block[1] for block in content.blocks)


def test_email_never_carries_internal_notes_or_the_reporter(admin, player) -> None:
    sanction, note = _queue(admin, player, internal_notes="reporter was user 41, secret-note")
    with mail.record_messages() as sent:
        deliver_notification(note.id)
    body = f"{sent[0].body} {sent[0].html}"
    assert "secret-note" not in body and "reporter" not in body.lower()
    assert FACTS in body and sent[0].recipients == [player.email]


def test_email_follows_the_account_language(admin, db_session) -> None:
    polish = _user(db_session, "ob_polish", language="pl")
    _, note = _queue(admin, polish)
    with mail.record_messages() as sent:
        deliver_notification(note.id)
    assert texts_for("pl")["subject"]["suspension"] in sent[0].subject


def test_no_contact_address_falls_back_to_the_generic_appeal_sentence() -> None:
    texts = texts_for("en")
    content = build_sanction_email("en", event="issued", kind="ban", username="Ada", reason_code="spam", facts=FACTS, contact="")
    flat = [block[1] for block in content.blocks]
    assert texts["appeal_no_contact"] in flat


def test_account_export_lists_sanctions_without_internal_notes(admin, player) -> None:
    from app.services.user.data_export import export_user_data

    actions.suspend(admin, player.id, reason_code="spam", facts=FACTS, duration_days=2, internal_notes="secret-note")
    exported = export_user_data(player.id)["sanctions"]
    assert [s["kind"] for s in exported] == ["suspension"] and exported[0]["facts"] == FACTS
    assert "secret-note" not in str(exported) and "issued_by_id" not in exported[0] and "report_id" not in exported[0]
    assert export_user_data(admin.id)["sanctions"] == []
