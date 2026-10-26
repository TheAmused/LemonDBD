# backend/tests/unit/moderation/test_retention_redating.py
"""A new warning lifetime or ban-list retention reaches the records already stored, not only new ones.

Each record is re-dated from its own start. Shortening ends old records early; lengthening extends
the ones still running and never brings back one that has already run out.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.account_state import as_utc
from app.core.extensions import db
from app.core.security import hash_password
from app.models.sanction import BannedEmailHash, UserSanction
from app.models.user import User
from app.services import site_settings
from app.services.moderation_actions import active_sanctions

NOW = datetime.now(timezone.utc)


def _user(login: str) -> User:
    user = User(login=login, username=login, email=f"{login}@example.com", password_hash=hash_password("password123"), is_verified=True)
    db.session.add(user)
    db.session.commit()
    return user


def _warning(user: User, age_days: int, lifetime_days: int, revoked: bool = False) -> UserSanction:
    issued = NOW - timedelta(days=age_days)
    row = UserSanction(
        user_id=user.id, kind="warning", reason_code="spam", source="manual", issued_at=issued,
        expires_at=issued + timedelta(days=lifetime_days), revoked_at=NOW if revoked else None,
    )
    db.session.add(row)
    db.session.commit()
    return row


def _entry(age_days: int, retention_days: int, n: int) -> BannedEmailHash:
    listed = NOW - timedelta(days=age_days)
    row = BannedEmailHash(email_hmac=f"{n:064x}", key_version=1, reason_code="spam", created_at=listed, expires_at=listed + timedelta(days=retention_days))
    db.session.add(row)
    db.session.commit()
    return row


def _save(changes: dict) -> None:
    site_settings.update_settings(changes)
    site_settings.invalidate_cache()
    db.session.expire_all()


@pytest.mark.unit
def test_a_shorter_warning_lifetime_ends_old_warnings_early(db_session) -> None:
    user = _user("warned")
    old, recent = _warning(user, age_days=40, lifetime_days=90), _warning(user, age_days=5, lifetime_days=90)
    assert len(active_sanctions(user.id, kind="warning")) == 2

    _save({"warning_lifetime_days": 30})
    assert [s.id for s in active_sanctions(user.id, kind="warning")] == [recent.id]
    assert as_utc(db.session.get(UserSanction, old.id).expires_at) == as_utc(old.issued_at) + timedelta(days=30)
    assert as_utc(db.session.get(UserSanction, recent.id).expires_at) == as_utc(recent.issued_at) + timedelta(days=30)


@pytest.mark.unit
def test_a_longer_warning_lifetime_extends_running_warnings_but_never_revives_expired_ones(db_session) -> None:
    user = _user("again")
    running, expired = _warning(user, age_days=10, lifetime_days=30), _warning(user, age_days=40, lifetime_days=30)
    revoked = _warning(user, age_days=1, lifetime_days=30, revoked=True)
    before_expired, before_revoked = as_utc(expired.expires_at), as_utc(revoked.expires_at)

    _save({"warning_lifetime_days": 90})
    assert as_utc(db.session.get(UserSanction, running.id).expires_at) == as_utc(running.issued_at) + timedelta(days=90)
    assert as_utc(db.session.get(UserSanction, expired.id).expires_at) == before_expired
    assert as_utc(db.session.get(UserSanction, revoked.id).expires_at) == before_revoked
    assert [s.id for s in active_sanctions(user.id, kind="warning")] == [running.id]


@pytest.mark.unit
def test_use_default_re_dates_as_well(db_session) -> None:
    user = _user("defaulted")
    _save({"warning_lifetime_days": 30})
    warning = _warning(user, age_days=1, lifetime_days=30)
    _save({"warning_lifetime_days": None})
    default = int(site_settings.default_value("warning_lifetime_days"))
    assert as_utc(db.session.get(UserSanction, warning.id).expires_at) == as_utc(warning.issued_at) + timedelta(days=default)


@pytest.mark.unit
def test_ban_list_retention_reaches_entries_already_listed(db_session) -> None:
    old, recent = _entry(age_days=200, retention_days=1095, n=1), _entry(age_days=10, retention_days=1095, n=2)
    gone = _entry(age_days=400, retention_days=365, n=3)  # already ran out, waiting for the purge
    before_gone = as_utc(gone.expires_at)

    _save({"ban_list_retention_days": 180})
    assert as_utc(db.session.get(BannedEmailHash, old.id).expires_at) == as_utc(old.created_at) + timedelta(days=180)
    assert as_utc(db.session.get(BannedEmailHash, old.id).expires_at) < NOW  # so it no longer blocks
    assert as_utc(db.session.get(BannedEmailHash, recent.id).expires_at) == as_utc(recent.created_at) + timedelta(days=180)
    assert as_utc(db.session.get(BannedEmailHash, gone.id).expires_at) == before_gone


@pytest.mark.unit
def test_other_settings_leave_records_alone(db_session) -> None:
    user = _user("untouched")
    warning = _warning(user, age_days=1, lifetime_days=7)
    entry = _entry(age_days=1, retention_days=7, n=4)
    _save({"contact_email": "help@lemondbd.test"})
    assert as_utc(db.session.get(UserSanction, warning.id).expires_at) == as_utc(warning.issued_at) + timedelta(days=7)
    assert as_utc(db.session.get(BannedEmailHash, entry.id).expires_at) == as_utc(entry.created_at) + timedelta(days=7)
