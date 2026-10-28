# backend/tests/unit/auth/test_two_factor_flow.py
"""Optional two-factor sign-in end to end: enrolment, login challenge, lockout, replay, recovery codes."""
from datetime import timedelta

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app.core import totp
from app.core.extensions import db, mail
from app.core.security import SESSION_COOKIE_NAME, generate_token, hash_password
from app.core.two_factor_crypto import decrypt_secret
from app.models import AdminAuditLog, User, UserRecoveryCode, UserTwoFactor
from app.models.base import utcnow
from app.services.user import two_factor

PASSWORD = "password123"


@pytest.fixture(autouse=True)
def _mail_sender(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    """Flask-Mail refuses to build a message without a sender; the test config has none."""
    monkeypatch.setattr(app.extensions["mail"], "default_sender", "noreply@lemondbd.test")


def _make_user(name: str = "alice", role: str = "user") -> User:
    user = User(
        login=name, username=name,
        email=f"{name}@example.com",
        password_hash=hash_password(PASSWORD),
        role=role,
        is_verified=True,
    )
    db.session.add(user)
    db.session.commit()
    return user


def _bearer(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


def _enrol(client: FlaskClient, user: User) -> tuple[str, list[str]]:
    """Run the whole opt-in from the profile page; returns (secret, recovery codes)."""
    headers = _bearer(user)
    setup = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=headers)
    assert setup.status_code == 200
    secret = setup.get_json()["secret"]
    enable = client.post(
        "/api/v1/auth/two-factor/enable", json={"code": totp.totp(secret)}, headers=headers
    )
    assert enable.status_code == 200
    return secret, enable.get_json()["recovery_codes"]


def _next_code(secret: str, ahead: int = 1) -> str:
    """A valid code for a step after the one enrolment used (enrolment burns the current step)."""
    return totp.hotp(secret, totp.current_step() + ahead)


def _challenge(client: FlaskClient, user: User) -> str:
    res = client.post("/api/v1/auth/login", json={"login": user.username, "password": PASSWORD})
    assert res.status_code == 200
    return res.get_json()["two_factor_token"]


def _finish(client: FlaskClient, challenge: str, code: str):
    return client.post("/api/v1/auth/login/two-factor", json={"two_factor_token": challenge, "code": code})


@pytest.mark.unit
class TestOptionalByDefault:
    def test_accounts_log_in_with_just_a_password_until_they_opt_in(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        res = client.post("/api/v1/auth/login", json={"login": user.username, "password": PASSWORD})
        assert res.status_code == 200
        assert res.get_json()["status"] == "success"
        assert any(h.startswith(f"{SESSION_COOKIE_NAME}=") for h in res.headers.getlist("Set-Cookie"))

    def test_status_of_an_account_without_2fa(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        body = client.get("/api/v1/auth/two-factor", headers=_bearer(user)).get_json()
        assert body == {"available": True, "enabled": False, "enabled_at": None, "recovery_codes_remaining": 0}

    def test_admins_are_not_forced_either(self, client: FlaskClient, db_session) -> None:
        admin = _make_user("boss", role="admin")
        res = client.post("/api/v1/auth/login", json={"login": admin.username, "password": PASSWORD})
        assert res.get_json()["status"] == "success"

    def test_endpoints_need_a_session(self, client: FlaskClient, db_session) -> None:
        assert client.get("/api/v1/auth/two-factor").status_code == 401
        assert client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}).status_code == 401


@pytest.mark.unit
class TestEnrolment:
    def test_setup_needs_the_password(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        none = client.post("/api/v1/auth/two-factor/setup", json={}, headers=_bearer(user))
        assert none.status_code == 400 and none.get_json()["error_code"] == "password_required"
        wrong = client.post("/api/v1/auth/two-factor/setup", json={"password": "nope"}, headers=_bearer(user))
        assert wrong.status_code == 403 and wrong.get_json()["error_code"] == "incorrect_password"

    def test_setup_returns_a_scannable_secret_and_stores_it_encrypted(
        self, app: Flask, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        res = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        body = res.get_json()
        assert res.headers["Cache-Control"] == "no-store"
        assert body["otpauth_uri"].startswith("otpauth://totp/LemonDBD%3Aalice?")
        assert f"secret={body['secret']}" in body["otpauth_uri"]
        row = db.session.scalar(db.select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
        assert row.enabled_at is None  # not active until confirmed
        assert body["secret"] not in row.secret_encrypted
        assert decrypt_secret(row.secret_encrypted) == body["secret"]

    def test_a_pending_setup_does_not_gate_login(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        res = client.post("/api/v1/auth/login", json={"login": user.username, "password": PASSWORD})
        assert res.get_json()["status"] == "success"

    def test_restarting_setup_replaces_the_secret(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        first = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        second = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        assert first.get_json()["secret"] != second.get_json()["secret"]
        stale = client.post(
            "/api/v1/auth/two-factor/enable",
            json={"code": totp.totp(first.get_json()["secret"])},
            headers=_bearer(user),
        )
        assert stale.status_code == 401

    def test_enable_without_setup_is_refused(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        res = client.post("/api/v1/auth/two-factor/enable", json={"code": "123456"}, headers=_bearer(user))
        assert res.status_code == 409 and res.get_json()["error_code"] == "two_factor_not_started"

    def test_wrong_code_does_not_enable(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        setup = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        wrong = "000000" if totp.totp(setup.get_json()["secret"]) != "000000" else "111111"
        res = client.post("/api/v1/auth/two-factor/enable", json={"code": wrong}, headers=_bearer(user))
        assert res.status_code == 401 and res.get_json()["error_code"] == "invalid_two_factor_code"
        assert client.get("/api/v1/auth/two-factor", headers=_bearer(user)).get_json()["enabled"] is False

    def test_enabling_returns_ten_single_use_recovery_codes_and_emails_a_notice(
        self, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        with mail.record_messages() as outbox:
            _, codes = _enrol(client, user)
        assert len(codes) == 10 and len(set(codes)) == 10
        assert all(len(c) == 11 and c[5] == "-" for c in codes)
        assert [m.subject for m in outbox] == ["LemonDBD: Two-factor authentication is now on"]
        status = client.get("/api/v1/auth/two-factor", headers=_bearer(user)).get_json()
        assert status["enabled"] is True and status["recovery_codes_remaining"] == 10
        hashes = [r.code_hash for r in db.session.scalars(db.select(UserRecoveryCode))]
        assert len(hashes) == 10 and not any(c.replace("-", "") in h for c in codes for h in hashes)

    def test_cannot_enrol_twice(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        res = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        assert res.status_code == 409 and res.get_json()["error_code"] == "two_factor_already_enabled"

    def test_without_an_encryption_key_it_fails_closed(
        self, app: Flask, client: FlaskClient, db_session, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        user = _make_user()
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", "")
        res = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        assert res.status_code == 503 and res.get_json()["error_code"] == "two_factor_unavailable"
        assert client.get("/api/v1/auth/two-factor", headers=_bearer(user)).get_json()["available"] is False
        assert db.session.scalar(db.select(db.func.count(UserTwoFactor.id))) == 0


@pytest.mark.unit
class TestLoginChallenge:
    def test_password_step_returns_a_challenge_and_no_session(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        client.delete_cookie(SESSION_COOKIE_NAME)
        res = client.post("/api/v1/auth/login", json={"login": user.username, "password": PASSWORD})
        body = res.get_json()
        assert res.status_code == 200
        assert body["status"] == "two_factor_required"
        assert body["methods"] == ["totp", "recovery"]
        assert "token" not in body and "user" not in body
        assert not any(h.startswith(f"{SESSION_COOKIE_NAME}=") for h in res.headers.getlist("Set-Cookie"))

    def test_wrong_password_still_looks_like_any_wrong_password(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        res = client.post("/api/v1/auth/login", json={"login": user.username, "password": "wrong-pass"})
        assert res.status_code == 401

    def test_the_challenge_is_not_a_session_by_any_route(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        challenge = _challenge(client, user)
        probes = [
            client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {challenge}"}),
            client.get(f"/api/v1/auth/me?token={challenge}"),
            client.get("/api/v1/auth/two-factor", headers={"Authorization": f"Bearer {challenge}"}),
        ]
        assert probes[0].get_json()["authenticated"] is False
        assert probes[1].get_json()["authenticated"] is False
        assert probes[2].status_code == 401
        client.set_cookie(SESSION_COOKIE_NAME, challenge)
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is False

    def test_correct_code_completes_the_login(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        client.delete_cookie(SESSION_COOKIE_NAME)
        res = _finish(client, _challenge(client, user), _next_code(secret))
        body = res.get_json()
        assert res.status_code == 200 and body["status"] == "success"
        assert body["two_factor_method"] == "totp"
        assert body["user"]["username"] == "alice"
        assert any(h.startswith(f"{SESSION_COOKIE_NAME}=") for h in res.headers.getlist("Set-Cookie"))
        assert client.get("/api/v1/auth/me").get_json()["authenticated"] is True

    def test_a_code_works_only_once(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        code = _next_code(secret)
        assert _finish(client, _challenge(client, user), code).status_code == 200
        replay = _finish(client, _challenge(client, user), code)
        assert replay.status_code == 401 and replay.get_json()["error_code"] == "invalid_two_factor_code"

    def test_the_enrolment_code_cannot_be_replayed_to_log_in(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        setup = client.post("/api/v1/auth/two-factor/setup", json={"password": PASSWORD}, headers=_bearer(user))
        secret = setup.get_json()["secret"]
        code = totp.totp(secret)
        client.post("/api/v1/auth/two-factor/enable", json={"code": code}, headers=_bearer(user))
        assert _finish(client, _challenge(client, user), code).status_code == 401

    def test_older_steps_than_the_last_one_used_are_refused(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        assert _finish(client, _challenge(client, user), _next_code(secret, 1)).status_code == 200
        older = totp.hotp(secret, totp.current_step() - 1)
        assert _finish(client, _challenge(client, user), older).status_code == 401

    def test_garbage_and_foreign_challenges_are_rejected(self, app: Flask, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        for bad in ["", "garbage", None, generate_token(user.id, user.role)]:  # last one: a real session token
            res = _finish(client, bad, _next_code(secret))
            assert res.status_code == 401 and res.get_json()["error_code"] == "two_factor_challenge_invalid"

    def test_expired_challenge_is_rejected(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        stale = generate_token(user.id, user.role, token_type="2fa", lifetime=timedelta(seconds=-5))
        assert _finish(client, stale, _next_code(secret)).status_code == 401

    def test_challenge_dies_when_the_password_changes(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        user.token_version += 1
        db.session.commit()
        assert _finish(client, challenge, _next_code(secret)).status_code == 401

    def test_challenge_for_a_disabled_account_is_rejected(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        user.is_active = False
        db.session.commit()
        # Fully authenticated (password and second factor), so the account is told why it is blocked.
        res = _finish(client, challenge, _next_code(secret))
        assert res.status_code == 403
        assert res.get_json()["code"] == "account_banned"

    def test_switching_off_between_steps_invalidates_the_challenge(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        two_factor.admin_reset(user)
        res = _finish(client, challenge, _next_code(secret))
        assert res.status_code == 401 and res.get_json()["error_code"] == "two_factor_challenge_invalid"

    def test_missing_key_blocks_the_second_step_instead_of_skipping_it(
        self, app: Flask, client: FlaskClient, db_session, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", "")
        assert _finish(client, challenge, _next_code(secret)).status_code == 503


@pytest.mark.unit
class TestLockout:
    def test_five_wrong_codes_lock_the_account_for_a_while(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        wrong = "000000" if _next_code(secret) != "000000" else "111111"
        for _ in range(4):
            assert _finish(client, challenge, wrong).status_code == 401
        locked = _finish(client, challenge, wrong)
        assert locked.status_code == 429 and locked.get_json()["error_code"] == "two_factor_locked"
        assert int(locked.headers["Retry-After"]) > 800
        # even the right code is refused while locked
        assert _finish(client, challenge, _next_code(secret)).status_code == 429

    def test_lock_is_per_account_and_ends(self, client: FlaskClient, db_session) -> None:
        alice, bob = _make_user("alice"), _make_user("bob")
        alice_secret, _ = _enrol(client, alice)
        bob_secret, _ = _enrol(client, bob)
        challenge = _challenge(client, alice)
        for _ in range(5):
            _finish(client, challenge, "000000" if _next_code(alice_secret) != "000000" else "111111")
        assert _finish(client, _challenge(client, bob), _next_code(bob_secret)).status_code == 200
        row = db.session.scalar(db.select(UserTwoFactor).where(UserTwoFactor.user_id == alice.id))
        row.locked_until = utcnow() - timedelta(seconds=1)
        db.session.commit()
        assert _finish(client, challenge, _next_code(alice_secret)).status_code == 200

    def test_a_good_code_resets_the_failure_count(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        wrong = "000000" if _next_code(secret) != "000000" else "111111"
        for _ in range(3):
            _finish(client, challenge, wrong)
        assert _finish(client, challenge, _next_code(secret)).status_code == 200
        row = db.session.scalar(db.select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
        db.session.refresh(row)
        assert row.failed_attempts == 0 and row.locked_until is None


@pytest.mark.unit
class TestRecoveryCodes:
    def test_a_recovery_code_logs_in_once(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _, codes = _enrol(client, user)
        res = _finish(client, _challenge(client, user), codes[0])
        assert res.status_code == 200
        assert res.get_json()["two_factor_method"] == "recovery"
        assert res.get_json()["recovery_codes_remaining"] == 9
        again = _finish(client, _challenge(client, user), codes[0])
        assert again.status_code == 401

    def test_typing_leniency_lowercase_no_dash_spaces(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _, codes = _enrol(client, user)
        typed = codes[1].replace("-", "").lower()
        assert _finish(client, _challenge(client, user), f"{typed[:5]} {typed[5:]}").status_code == 200

    def test_a_wrong_recovery_code_counts_as_a_failure(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        assert _finish(client, _challenge(client, user), "ZZZZZ-ZZZZZ").status_code == 401
        row = db.session.scalar(db.select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
        assert row.failed_attempts == 1

    def test_regenerating_replaces_all_codes(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, old_codes = _enrol(client, user)
        res = client.post(
            "/api/v1/auth/two-factor/recovery-codes",
            json={"password": PASSWORD, "code": _next_code(secret)},
            headers=_bearer(user),
        )
        new_codes = res.get_json()["recovery_codes"]
        assert res.status_code == 200 and len(new_codes) == 10 and not set(new_codes) & set(old_codes)
        assert _finish(client, _challenge(client, user), old_codes[0]).status_code == 401
        assert _finish(client, _challenge(client, user), new_codes[0]).status_code == 200

    def test_regenerating_needs_the_password_and_a_code(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        url = "/api/v1/auth/two-factor/recovery-codes"
        assert client.post(url, json={"password": PASSWORD}, headers=_bearer(user)).get_json()["error_code"] == "two_factor_required"
        assert client.post(url, json={"password": "bad", "code": _next_code(secret)}, headers=_bearer(user)).status_code == 403


@pytest.mark.unit
class TestSensitiveActionsAskForTheCode:
    def test_disable_needs_password_and_code_then_removes_everything(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        url = "/api/v1/auth/two-factor/disable"
        assert client.post(url, json={"password": PASSWORD}, headers=_bearer(user)).get_json()["error_code"] == "two_factor_required"
        assert client.post(url, json={"password": "bad", "code": _next_code(secret)}, headers=_bearer(user)).status_code == 403
        assert client.post(url, json={"password": PASSWORD, "code": "000000"}, headers=_bearer(user)).status_code == 401
        assert client.get("/api/v1/auth/two-factor", headers=_bearer(user)).get_json()["enabled"] is True
        with mail.record_messages() as outbox:
            ok = client.post(url, json={"password": PASSWORD, "code": _next_code(secret)}, headers=_bearer(user))
        assert ok.status_code == 200
        assert [m.subject for m in outbox] == ["LemonDBD: Two-factor authentication was turned off"]
        assert db.session.scalar(db.select(db.func.count(UserTwoFactor.id))) == 0
        assert db.session.scalar(db.select(db.func.count(UserRecoveryCode.id))) == 0
        login = client.post("/api/v1/auth/login", json={"login": user.username, "password": PASSWORD})
        assert login.get_json()["status"] == "success"

    def test_disable_with_a_recovery_code(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _, codes = _enrol(client, user)
        res = client.post(
            "/api/v1/auth/two-factor/disable", json={"password": PASSWORD, "code": codes[0]}, headers=_bearer(user)
        )
        assert res.status_code == 200

    def test_changing_the_password_asks_for_a_code(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        body = {"new_password": "brand-new-pass", "current_password": PASSWORD}
        missing = client.put("/api/v1/auth/profile", json=body, headers=_bearer(user))
        assert missing.status_code == 403 and missing.get_json()["error_code"] == "two_factor_required"
        ok = client.put(
            "/api/v1/auth/profile", json={**body, "two_factor_code": _next_code(secret)}, headers=_bearer(user)
        )
        assert ok.status_code == 200

    def test_avatar_only_edits_do_not_ask(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        _enrol(client, user)
        res = client.put("/api/v1/auth/profile", json={"avatar_url": "x"}, headers=_bearer(user))
        assert res.status_code == 200

    def test_a_wrong_password_does_not_burn_a_valid_code(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        code = _next_code(secret)
        bad = client.put(
            "/api/v1/auth/profile",
            json={"new_password": "brand-new-pass", "current_password": "wrong", "two_factor_code": code},
            headers=_bearer(user),
        )
        assert bad.status_code == 403
        ok = client.put(
            "/api/v1/auth/profile",
            json={"new_password": "brand-new-pass", "current_password": PASSWORD, "two_factor_code": code},
            headers=_bearer(user),
        )
        assert ok.status_code == 200

    def test_profile_or_delete_validation_error_does_not_burn_code_or_recovery_code(
        self, client: FlaskClient, db_session
    ) -> None:
        admin = _make_user("boss", role="admin")
        other = _make_user("taken")
        secret, codes = _enrol(client, admin)
        totp_code = _next_code(secret)
        too_short = client.put(
            "/api/v1/auth/profile",
            json={"new_password": "123", "current_password": PASSWORD, "two_factor_code": totp_code},
            headers=_bearer(admin),
        )
        assert too_short.status_code == 400
        dup_email = client.put(
            "/api/v1/auth/profile",
            json={"email": other.email, "current_password": PASSWORD, "two_factor_code": codes[0]},
            headers=_bearer(admin),
        )
        assert dup_email.status_code == 400
        last_admin = client.delete(
            "/api/v1/auth/account",
            json={"password": PASSWORD, "two_factor_code": codes[0]},
            headers=_bearer(admin),
        )
        assert last_admin.status_code == 400
        # Neither the TOTP step nor the recovery code was consumed by the rejected requests:
        ok = client.put(
            "/api/v1/auth/profile",
            json={"new_password": "brand-new-pass", "current_password": PASSWORD, "two_factor_code": totp_code},
            headers=_bearer(admin),
        )
        assert ok.status_code == 200
        assert client.get("/api/v1/auth/two-factor", headers=_bearer(admin)).get_json()["recovery_codes_remaining"] == 10

    def test_deleting_the_account_asks_for_a_code_and_removes_the_2fa_rows(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, _ = _enrol(client, user)
        user_id = user.id
        missing = client.delete("/api/v1/auth/account", json={"password": PASSWORD}, headers=_bearer(user))
        assert missing.status_code == 403 and missing.get_json()["error_code"] == "two_factor_required"
        ok = client.delete(
            "/api/v1/auth/account",
            json={"password": PASSWORD, "two_factor_code": _next_code(secret)},
            headers=_bearer(user),
        )
        assert ok.status_code == 200
        assert db.session.scalar(db.select(db.func.count(UserTwoFactor.id)).where(UserTwoFactor.user_id == user_id)) == 0
        assert db.session.scalar(db.select(db.func.count(UserRecoveryCode.id)).where(UserRecoveryCode.user_id == user_id)) == 0

    def test_enabling_disabling_or_resetting_revokes_older_sessions_and_me_reports_flag(
        self, client: FlaskClient, db_session
    ) -> None:
        user = _make_user()
        pre_enrol_headers = _bearer(user)
        assert client.get("/api/v1/auth/me", headers=pre_enrol_headers).get_json()["user"]["two_factor_enabled"] is False
        secret, _ = _enrol(client, user)
        assert client.get("/api/v1/auth/me", headers=pre_enrol_headers).get_json()["authenticated"] is False
        post_enrol_headers = _bearer(user)
        assert client.get("/api/v1/auth/me", headers=post_enrol_headers).get_json()["user"]["two_factor_enabled"] is True
        dis = client.post(
            "/api/v1/auth/two-factor/disable",
            json={"password": PASSWORD, "code": _next_code(secret)},
            headers={**post_enrol_headers, "X-Return-Token": "1"},
        )
        assert dis.status_code == 200 and dis.get_json().get("token")
        assert client.get("/api/v1/auth/me", headers=post_enrol_headers).get_json()["authenticated"] is False


@pytest.mark.unit
class TestAdminSide:
    def test_admin_reset_switches_it_off_audits_and_emails(self, client: FlaskClient, db_session) -> None:
        admin = _make_user("boss", role="admin")
        victim = _make_user("victim")
        _enrol(client, victim)
        victim_session = _bearer(victim)
        with mail.record_messages() as outbox:
            res = client.post(f"/api/v1/users/{victim.id}/two-factor/reset", headers=_bearer(admin))
        assert res.status_code == 200 and res.get_json()["had_two_factor"] is True
        assert client.get("/api/v1/auth/me", headers=victim_session).get_json()["authenticated"] is False
        assert [m.subject for m in outbox] == ["LemonDBD: Two-factor authentication was reset by an administrator"]
        log = db.session.scalar(db.select(AdminAuditLog).where(AdminAuditLog.action == "user_two_factor_reset"))
        assert log.admin_user_id == admin.id and log.target_id == str(victim.id)
        login = client.post("/api/v1/auth/login", json={"login": "victim", "password": PASSWORD})
        assert login.get_json()["status"] == "success"

    def test_reset_on_an_account_without_2fa_is_harmless_and_silent(self, client: FlaskClient, db_session) -> None:
        admin = _make_user("boss", role="admin")
        plain = _make_user("plain")
        with mail.record_messages() as outbox:
            res = client.post(f"/api/v1/users/{plain.id}/two-factor/reset", headers=_bearer(admin))
        assert res.get_json()["had_two_factor"] is False and outbox == []

    def test_only_admins_may_reset(self, client: FlaskClient, db_session) -> None:
        user, other = _make_user("user1"), _make_user("user2")
        _enrol(client, other)
        assert client.post(f"/api/v1/users/{other.id}/two-factor/reset", headers=_bearer(user)).status_code == 403
        assert client.get("/api/v1/auth/two-factor", headers=_bearer(other)).get_json()["enabled"] is True

    def test_reset_of_an_unknown_user_is_404(self, client: FlaskClient, db_session) -> None:
        admin = _make_user("boss", role="admin")
        assert client.post("/api/v1/users/9999/two-factor/reset", headers=_bearer(admin)).status_code == 404

    def test_admin_user_list_shows_who_has_it_on(self, client: FlaskClient, db_session) -> None:
        admin = _make_user("boss", role="admin")
        on, _off = _make_user("with2fa"), _make_user("without2fa")
        _enrol(client, on)
        users = client.get("/api/v1/users", headers=_bearer(admin)).get_json()["users"]
        flags = {u["username"]: u["two_factor_enabled"] for u in users}
        assert flags["with2fa"] is True and flags["without2fa"] is False and flags["boss"] is False


@pytest.mark.unit
class TestNothingSecretLeaksInTheExport:
    def test_export_reports_status_only(self, client: FlaskClient, db_session) -> None:
        user = _make_user()
        secret, codes = _enrol(client, user)
        res = client.get("/api/v1/auth/account/export", headers=_bearer(user))
        raw = res.get_data(as_text=True)
        body = res.get_json()
        assert body["two_factor"]["enabled"] is True and body["two_factor"]["recovery_codes_remaining"] == 10
        row = db.session.scalar(db.select(UserTwoFactor).where(UserTwoFactor.user_id == user.id))
        assert secret not in raw and row.secret_encrypted not in raw
        assert not any(c in raw or c.replace("-", "") in raw for c in codes)
        assert "token_version" not in body["account"]
