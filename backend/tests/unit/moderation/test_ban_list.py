# backend/tests/unit/moderation/test_ban_list.py
"""Ban-evasion e-mail list: keyed hashes of permanently banned addresses, checked only at sign-up."""
import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import ban_list_pepper_problems, parse_ban_list_peppers, weak_secret_warnings
from app.core.extensions import db
from app.core.security import hash_password
from app.models import BannedEmailHash, UserSanction
from app.models.user import User
from app.services import ban_list, site_settings
from app.services import moderation_actions as actions
from app.services.user import google_auth
from app.services.user.google_auth import GoogleIdentity

REGISTER = "/api/v1/auth/register"
GOOGLE = "/api/v1/auth/google"
V1 = "0f1e2d3c4b5a6978" * 4
V2 = "a1b2c3d4e5f60718" * 4
V3 = "9988776655443322" * 4
FACTS = "Evaded an earlier ban."


@pytest.fixture(autouse=True)
def _isolated_config(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    """The app is shared by the whole session: put back whatever a test changes."""
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")
    for key, value in (
        ("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com"),
        ("BAN_LIST_ENABLED", app.config["BAN_LIST_ENABLED"]),
        ("BAN_LIST_PEPPERS", app.config["BAN_LIST_PEPPERS"]),
    ):
        monkeypatch.setitem(app.config, key, value)


def _user(db_session: Session, login: str, email: str | None = None, role: str = "user") -> User:
    user = User(
        login=login,
        username=login.title(),
        email=email or f"{login}@example.com",
        password_hash=hash_password("correct-horse-1"),
        role=role,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin(db_session: Session) -> User:
    return _user(db_session, "bl_admin", role="admin")


def _ban(admin: User, user: User) -> UserSanction:
    return actions.ban(admin, user.id, reason_code="ban_evasion", facts=FACTS)


def _entries() -> list[BannedEmailHash]:
    return list(db.session.scalars(select(BannedEmailHash)))


def _register(client: FlaskClient, email: str, login: str = "fresh_login"):
    return client.post(
        REGISTER, json={"login": login, "username": "Fresh Name", "email": email, "password": "password123"}
    )


def _expected(pepper_hex: str, canonical: str) -> str:
    return hmac.new(bytes.fromhex(pepper_hex), b"lemondbd:ban-email:v1\0" + canonical.encode(), hashlib.sha256).hexdigest()


# --- hashing -----------------------------------------------------------------------------------


def test_hash_is_hmac_of_the_canonical_address_under_the_newest_pepper(app, admin, db_session) -> None:
    target = _user(db_session, "hash_target", "H.a.sh+promo@Gmail.com")
    _ban(admin, target)

    (entry,) = _entries()
    assert entry.email_hmac == _expected(V2, "hash@gmail.com")
    assert entry.key_version == 2
    assert len(entry.email_hmac) == 64
    assert "hash" not in entry.email_hmac and "@" not in entry.email_hmac
    assert entry.reason_code == "ban_evasion"
    assert entry.sanction_id is not None


def test_lookup_ignores_dots_tags_case_and_googlemail(app, admin, db_session) -> None:
    _ban(admin, _user(db_session, "variant_target", "variant@gmail.com"))

    for variant in ("v.a.r.i.a.n.t@gmail.com", "variant+x@gmail.com", "VARIANT@GoogleMail.com", " variant@gmail.com "):
        assert ban_list.is_email_banned(variant), variant
    assert not ban_list.is_email_banned("other@gmail.com")
    assert not ban_list.is_email_banned("variant@example.com")
    assert not ban_list.is_email_banned(None)
    assert not ban_list.is_email_banned("not an address")


def test_unknown_domains_stay_distinct_by_tag(app, admin, db_session) -> None:
    _ban(admin, _user(db_session, "plain_target", "name@small-provider.example"))

    assert ban_list.is_email_banned("NAME@small-provider.example")
    assert not ban_list.is_email_banned("name+tag@small-provider.example")


def test_old_pepper_versions_still_match_after_rotation(app, admin, db_session) -> None:
    app.config["BAN_LIST_PEPPERS"] = f"v1:{V1}"
    _ban(admin, _user(db_session, "rotated_target", "rotated@example.com"))
    assert _entries()[0].key_version == 1

    app.config["BAN_LIST_PEPPERS"] = f"v2:{V2},v1:{V1}"
    assert ban_list.is_email_banned("rotated@example.com")

    # New bans use the newest version, and both are found.
    _ban(admin, _user(db_session, "rotated_two", "rotated.two@example.com"))
    assert sorted(entry.key_version for entry in _entries()) == [1, 2]
    assert ban_list.is_email_banned("rotated.two@example.com")

    # Dropping v1 from the configuration makes its entries unmatchable (documented in the plan).
    app.config["BAN_LIST_PEPPERS"] = f"v2:{V2}"
    assert not ban_list.is_email_banned("rotated@example.com")
    assert ban_list.is_email_banned("rotated.two@example.com")


def test_a_different_pepper_does_not_match(app, admin, db_session) -> None:
    _ban(admin, _user(db_session, "pepper_target", "pepper@example.com"))
    app.config["BAN_LIST_PEPPERS"] = f"v3:{V3}"
    assert not ban_list.is_email_banned("pepper@example.com")


# --- lifecycle ---------------------------------------------------------------------------------


def test_only_a_permanent_ban_adds_an_entry(app, admin, db_session) -> None:
    target = _user(db_session, "only_ban", "onlyban@example.com")
    actions.issue_warning(admin, target.id, reason_code="spam")
    actions.suspend(admin, target.id, reason_code="spam", facts=FACTS, duration_days=3)
    assert _entries() == []

    _ban(admin, target)
    assert len(_entries()) == 1


def test_lifting_the_ban_removes_the_entry(app, admin, db_session) -> None:
    target = _user(db_session, "lifted_ban", "lifted@example.com")
    sanction = _ban(admin, target)
    assert ban_list.is_email_banned("lifted@example.com")

    actions.revoke_sanction(admin, sanction.id, "Mistake")
    assert _entries() == []
    assert not ban_list.is_email_banned("lifted@example.com")


def test_restoring_the_account_removes_the_entry(app, admin, db_session) -> None:
    target = _user(db_session, "restored_ban", "restored@example.com")
    _ban(admin, target)

    actions.restore_account(admin, target.id, "Appeal accepted")
    assert _entries() == []


def test_a_second_ban_of_the_same_address_is_a_second_row_and_lifting_one_keeps_the_other(
    app, admin, db_session
) -> None:
    first = _user(db_session, "dup_one", "dup@gmail.com")
    second = _user(db_session, "dup_two", "d.u.p@gmail.com")
    ban_one = _ban(admin, first)
    _ban(admin, second)
    assert len(_entries()) == 2

    actions.revoke_sanction(admin, ban_one.id, "Mistake")
    assert len(_entries()) == 1
    assert ban_list.is_email_banned("dup@gmail.com")


def test_entry_survives_deleting_the_account_and_expires_on_schedule(app, admin, db_session) -> None:
    target = _user(db_session, "deleted_ban", "deleted@example.com")
    _ban(admin, target)
    entry = _entries()[0]
    assert (entry.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days in (1094, 1095)

    # Deleting the account removes its sanctions; SQLite does not enforce SET NULL, so apply it.
    db_session.execute(BannedEmailHash.__table__.update().values(sanction_id=None))
    db_session.commit()
    assert ban_list.is_email_banned("deleted@example.com")

    entry = _entries()[0]
    assert ban_list.purge_expired(datetime.now(timezone.utc)) == 0
    assert ban_list.purge_expired(entry.expires_at.replace(tzinfo=timezone.utc) + timedelta(seconds=1)) == 1
    assert not ban_list.is_email_banned("deleted@example.com")


def test_expired_entry_no_longer_blocks_even_before_the_purge(app, admin, db_session) -> None:
    _ban(admin, _user(db_session, "stale_ban", "stale@example.com"))
    entry = _entries()[0]
    entry.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()

    assert not ban_list.is_email_banned("stale@example.com")


def test_retention_setting_sets_the_expiry(app, admin, db_session) -> None:
    site_settings.update_settings({"ban_list_retention_days": 60})
    _ban(admin, _user(db_session, "short_ban", "short@example.com"))

    entry = _entries()[0]
    days = (entry.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days
    assert days in (59, 60)


# --- enforcement ---------------------------------------------------------------------------------


def test_registration_is_refused_with_a_neutral_message(app, client, admin, db_session) -> None:
    site_settings.update_settings({"contact_email": "help@lemondbd.test"})
    _ban(admin, _user(db_session, "reg_target", "evader@gmail.com"))

    res = _register(client, "e.v.a.d.e.r+again@gmail.com")

    assert res.status_code == 400
    message = res.get_json()["error"] if "error" in res.get_json() else res.get_json()["message"]
    assert message.startswith("This e-mail address cannot be used to register.")
    assert "help@lemondbd.test" in message
    assert "banned" not in message.lower()
    assert db_session.scalar(select(User).where(User.login == "fresh_login")) is None


def test_refusal_does_not_reveal_whether_an_account_exists(app, client, admin, db_session) -> None:
    # The banned account itself is still there; the answer for its address is the same neutral one.
    _ban(admin, _user(db_session, "exists_ban", "exists@example.com"))
    res = _register(client, "exists@example.com")
    assert "already registered" not in str(res.get_json())
    assert "cannot be used to register" in str(res.get_json())


def test_unrelated_address_registers_normally(app, client, admin, db_session) -> None:
    _ban(admin, _user(db_session, "other_ban", "banned@example.com"))
    assert _register(client, "someone.else@example.com").status_code == 201


def test_lifted_ban_lets_the_address_register_again(app, client, admin, db_session) -> None:
    sanction = _ban(admin, _user(db_session, "again_ban", "again@example.com"))
    assert _register(client, "again@example.com").status_code == 400
    actions.revoke_sanction(admin, sanction.id, "Mistake")
    # The old (unbanned) account still owns the address, so the normal duplicate rule answers.
    assert "already registered" in str(_register(client, "again@example.com").get_json())


def test_google_sign_up_is_refused_but_an_existing_account_can_still_sign_in(
    app, client, admin, db_session, monkeypatch
) -> None:
    _ban(admin, _user(db_session, "g_target", "googler@gmail.com"))
    monkeypatch.setattr(
        google_auth, "verify_id_token", lambda credential: GoogleIdentity(sub="sub-new", email="g.o.o.g.l.e.r+x@gmail.com")
    )

    res = client.post(GOOGLE, json={"credential": "x"})

    assert res.status_code == 403
    assert "cannot be used to register" in str(res.get_json())
    assert db_session.scalar(select(User).where(User.google_sub == "sub-new")) is None


def test_a_google_account_that_already_exists_is_not_checked(app, client, admin, db_session, monkeypatch) -> None:
    # Sign-in (not account creation) never consults the list; a ban is handled by the account state.
    existing = _user(db_session, "g_existing", "existing@gmail.com")
    monkeypatch.setattr(
        google_auth, "verify_id_token", lambda credential: GoogleIdentity(sub="sub-existing", email="existing@gmail.com")
    )
    ban_list.record_ban(
        UserSanction(id=999, user_id=existing.id, kind="ban", reason_code="spam"), "existing@gmail.com"
    )
    db_session.commit()

    res = client.post(GOOGLE, json={"credential": "x"})
    assert res.status_code == 200


# --- switched off ----------------------------------------------------------------------------------


def test_when_disabled_nothing_is_stored_or_checked(app, client, admin, db_session) -> None:
    app.config["BAN_LIST_ENABLED"] = False
    _ban(admin, _user(db_session, "off_ban", "off@example.com"))

    assert _entries() == []
    assert not ban_list.is_email_banned("off@example.com")
    assert "already registered" in str(_register(client, "off@example.com").get_json())


def test_without_a_valid_pepper_nothing_is_stored(app, admin, db_session) -> None:
    app.config["BAN_LIST_PEPPERS"] = "v1:abcd"
    _ban(admin, _user(db_session, "weak_ban", "weak@example.com"))
    assert _entries() == []
    assert not ban_list.is_email_banned("weak@example.com")


def test_a_disabled_list_still_removes_entries_of_lifted_bans(app, admin, db_session) -> None:
    sanction = _ban(admin, _user(db_session, "cleanup_ban", "cleanup@example.com"))
    app.config["BAN_LIST_ENABLED"] = False
    actions.revoke_sanction(admin, sanction.id, "Mistake")
    assert _entries() == []


# --- backfill --------------------------------------------------------------------------------------


def test_backfill_adds_only_running_bans_without_an_entry(app, admin, db_session) -> None:
    app.config["BAN_LIST_ENABLED"] = False
    first = _user(db_session, "bf_one", "bf.one@example.com")
    second = _user(db_session, "bf_two", "bf.two@example.com")
    _ban(admin, first)
    lifted = _ban(admin, second)
    actions.revoke_sanction(admin, lifted.id, "Mistake")
    app.config["BAN_LIST_ENABLED"] = True

    assert ban_list.backfill_from_bans(dry_run=True) == {"bans": 1, "missing": 1, "added": 0, "skipped": 0}
    assert _entries() == []

    assert ban_list.backfill_from_bans() == {"bans": 1, "missing": 1, "added": 1, "skipped": 0}
    assert ban_list.is_email_banned("bf.one@example.com")
    assert not ban_list.is_email_banned("bf.two@example.com")
    assert ban_list.backfill_from_bans() == {"bans": 1, "missing": 0, "added": 0, "skipped": 0}
    assert len(_entries()) == 1


# --- configuration -----------------------------------------------------------------------------------


def test_pepper_parsing_accepts_only_long_random_hex_in_order() -> None:
    peppers, problems = parse_ban_list_peppers(f"v2:{V2}, v1:{V1}")
    assert [version for version, _key in peppers] == [2, 1]
    assert problems == []

    for bad in ("", "v1", "1:" + V1, "v1:zz", "v1:" + "ab" * 8, "v1:" + "00" * 32, f"v1:{V1},v1:{V2}"):
        peppers, _ = parse_ban_list_peppers(bad)
        assert len(peppers) <= 1
    assert parse_ban_list_peppers("v1:" + "ab" * 8)[0] == []
    assert parse_ban_list_peppers("v1:" + "00" * 32)[0] == []
    assert [v for v, _ in parse_ban_list_peppers(f"v1:{V1},v1:{V2}")[0]] == [1]


def test_missing_or_weak_pepper_is_reported_but_never_echoed() -> None:
    assert any("empty" in p for p in ban_list_pepper_problems(""))
    problems = ban_list_pepper_problems("v1:abcdef")
    assert problems and all("abcdef" not in p for p in problems)
    assert ban_list_pepper_problems(f"v1:{V1}") == []


def test_production_warning_only_when_the_list_is_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FLASK_ENV", "production")
    base = {"TESTING": False, "SECRET_KEY": "x" * 40, "JWT_SECRET_KEY": "y" * 40}
    assert weak_secret_warnings({**base, "BAN_LIST_ENABLED": False, "BAN_LIST_PEPPERS": ""}) == []
    enabled = weak_secret_warnings({**base, "BAN_LIST_ENABLED": True, "BAN_LIST_PEPPERS": ""})
    assert any("BAN_LIST_PEPPERS" in p for p in enabled)
    assert weak_secret_warnings({**base, "BAN_LIST_ENABLED": True, "BAN_LIST_PEPPERS": f"v1:{V1}"}) == []
