# backend/tests/unit/moderation/test_ban_list_export.py
"""The ban-evasion list in the database export/import: what travels, what never does, and how it lands."""
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.extensions import db
from app.core.security import hash_password
from app.models import BannedEmailHash
from app.models.user import User
from app.services import moderation_actions as actions
from app.services.db import export_registry
from app.services.db.export_import import DatabaseExportImportService

V1 = "0f1e2d3c4b5a6978" * 4
V2 = "a1b2c3d4e5f60718" * 4
TARGET = ["banned_email_hashes"]
HASH_A = "a" * 64
HASH_B = "b" * 64


@pytest.fixture(autouse=True)
def _isolated_config(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    for key in ("BAN_LIST_ENABLED", "BAN_LIST_PEPPERS"):
        monkeypatch.setitem(app.config, key, app.config[key])


def _entries() -> list[BannedEmailHash]:
    return list(db.session.scalars(select(BannedEmailHash).order_by(BannedEmailHash.id)))


def _row(value: str = HASH_A, **over):
    base = {
        "email_hmac": value,
        "key_version": 2,
        "reason_code": "ban_evasion",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=100)).isoformat(),
    }
    return {**base, **over}


def _payload(*rows):
    return {"groups": {"users": {"banned_email_hashes": list(rows)}}}


def _import(*rows, mode: str = "merge") -> dict:
    return DatabaseExportImportService.import_database(_payload(*rows), mode=mode, targets=TARGET)["summary"][
        "banned_email_hashes"
    ]


def _banned_user(db_session: Session, login: str = "exp_target") -> User:
    admin = User(login="exp_admin", username="Exp Admin", email="exp_admin@example.com",
                 password_hash=hash_password("correct-horse-1"), role="admin", is_verified=True)
    user = User(login=login, username=login.title(), email=f"{login}@example.com",
                password_hash=hash_password("correct-horse-1"), role="user", is_verified=True)
    db_session.add_all([admin, user])
    db_session.commit()
    actions.ban(admin, user.id, reason_code="ban_evasion", facts="Evaded an earlier ban.")
    return user


def test_the_table_is_a_user_group_export_target() -> None:
    assert "banned_email_hashes" in export_registry.TARGET_GROUPS["users"]
    assert "banned_email_hashes" in export_registry.SUPPORTED_EXPORT_TARGETS


def test_export_carries_the_hash_and_dates_but_never_the_pepper_or_the_address(app, db_session) -> None:
    user = _banned_user(db_session)
    exported = DatabaseExportImportService.export_database(targets=TARGET)

    assert exported["counts"]["banned_email_hashes"] == 1
    (row,) = exported["groups"]["users"]["banned_email_hashes"]
    assert set(row) == {"email_hmac", "key_version", "reason_code", "created_at", "expires_at"}
    assert row["email_hmac"] == _entries()[0].email_hmac and row["key_version"] == 2
    whole = repr(exported)
    assert V1 not in whole and V2 not in whole and user.email not in whole


def test_full_export_includes_the_list(app, db_session) -> None:
    _banned_user(db_session)
    exported = DatabaseExportImportService.export_database(include_assets=False)
    assert exported["counts"]["banned_email_hashes"] == 1


def test_round_trip_restores_an_entry_that_still_blocks_registration(app, client: FlaskClient, db_session) -> None:
    user = _banned_user(db_session)
    exported = DatabaseExportImportService.export_database(targets=TARGET)
    db.session.execute(BannedEmailHash.__table__.delete())
    db.session.commit()
    assert _entries() == []

    summary = DatabaseExportImportService.import_database(exported, mode="merge", targets=TARGET)["summary"]

    assert summary["banned_email_hashes"] == {"created": 1, "updated": 0, "skipped": 0, "unverifiable": 0}
    (entry,) = _entries()
    assert entry.sanction_id is None and entry.key_version == 2
    response = client.post(
        "/api/v1/auth/register",
        json={"login": "fresh_login", "username": "Fresh", "email": user.email, "password": "password123"},
    )
    assert response.status_code == 400


def test_importing_twice_changes_nothing(app, db_session) -> None:
    row = _row()
    assert _import(row)["created"] == 1
    assert _import(row) == {"created": 0, "updated": 0, "skipped": 0, "unverifiable": 0}
    assert len(_entries()) == 1


def test_a_repeated_hash_in_one_file_is_one_entry(app, db_session) -> None:
    row = _row()
    assert _import(row, row)["created"] == 1
    assert len(_entries()) == 1


def test_an_already_listed_hash_only_gets_a_later_expiry(app, db_session) -> None:
    near = datetime.now(timezone.utc) + timedelta(days=10)
    far = datetime.now(timezone.utc) + timedelta(days=300)
    _import(_row(expires_at=near.isoformat()))

    assert _import(_row(expires_at=far.isoformat()))["updated"] == 1
    assert abs(_entries()[0].expires_at.replace(tzinfo=timezone.utc) - far) < timedelta(seconds=2)
    assert _import(_row(expires_at=near.isoformat()))["updated"] == 0
    assert abs(_entries()[0].expires_at.replace(tzinfo=timezone.utc) - far) < timedelta(seconds=2)


def test_expired_and_malformed_rows_are_skipped(app, db_session) -> None:
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    summary = _import(
        _row(HASH_A, expires_at=past),
        _row("not-a-hash"),
        _row("C" * 63),
        _row(HASH_B, key_version="2"),
        _row(HASH_B, key_version=True),
        _row(HASH_B, reason_code=""),
        _row(HASH_B, expires_at=None),
        _row(HASH_B),
    )
    assert summary["created"] == 1 and summary["skipped"] == 7
    assert [e.email_hmac for e in _entries()] == [HASH_B]


def test_hashes_are_stored_lower_case(app, db_session) -> None:
    _import(_row("AB" * 32))
    assert _entries()[0].email_hmac == "ab" * 32


def test_rows_of_an_unconfigured_pepper_version_are_kept_and_counted(app, db_session) -> None:
    summary = _import(_row(HASH_A, key_version=2), _row(HASH_B, key_version=9))
    assert summary["created"] == 2 and summary["unverifiable"] == 1


def test_merge_leaves_other_entries_alone(app, db_session) -> None:
    _banned_user(db_session)
    before = _entries()[0].email_hmac
    _import(_row())
    assert {e.email_hmac for e in _entries()} == {before, HASH_A}


def test_replace_swaps_the_whole_list_for_the_file(app, db_session) -> None:
    _banned_user(db_session)
    _import(_row(HASH_A), mode="replace")
    assert [e.email_hmac for e in _entries()] == [HASH_A]


def test_replace_of_other_targets_does_not_touch_the_list(app, db_session) -> None:
    _banned_user(db_session)
    DatabaseExportImportService.import_database({"groups": {"users": {}}}, mode="replace", targets=["user_showcases"])
    assert len(_entries()) == 1


def test_imported_entry_is_removed_by_the_scheduled_purge_after_it_expires(app, db_session) -> None:
    from app.services import ban_list

    _import(_row(expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat()))
    assert ban_list.purge_expired() == 0
    assert ban_list.purge_expired(datetime.now(timezone.utc) + timedelta(days=2)) == 1
