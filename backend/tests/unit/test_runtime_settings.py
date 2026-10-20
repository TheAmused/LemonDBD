# backend/tests/unit/test_runtime_settings.py
"""Settings an admin can change without a rebuild: validation, safeguards, secrets, the public
endpoint and the places that read them (limits, switches, retention)."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from flask import Flask, jsonify
from flask.testing import FlaskClient
from flask_limiter import Limiter

from app.core import totp
from app.core.extensions import db
from app.core.rate_limits import per_minute
from app.core.security import generate_token, hash_password
from app.models import AdminAuditLog, SiteSetting, User
from app.services import discord_webhook, site_settings
from app.services.site_settings import RiskyChangeError
from app.utils.site_settings_spec import (
    BANNER_LOCALES,
    RISKY_KEYS,
    SETTING_SPECS,
    SPEC_BY_KEY,
    is_risky_change,
    validate_setting,
)

KNOWN_KINDS = {"bool", "int", "email", "url", "text", "choice", "datetime", "secret"}
WEBHOOK = "https://discord.com/api/webhooks/123456789/abcdefTOKEN-secret_value"


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {generate_token(user.id, user.role)}"}


@pytest.fixture
def admin(db_session) -> User:
    user = User(login="rs_admin", username="rs_admin", email="rs_admin@example.com", password_hash="h", role="admin")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def player(db_session) -> User:
    user = User(login="rs_player", username="rs_player", email="rs_player@example.com", password_hash="h")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.mark.unit
class TestRegistry:
    def test_every_setting_is_declared_completely(self) -> None:
        for spec in SETTING_SPECS:
            assert spec.kind in KNOWN_KINDS, spec.key
            assert spec.key in site_settings._FALLBACK_DEFAULTS, f"{spec.key} has no default"
            assert len(spec.key) <= 64
            if spec.kind == "int":
                assert spec.minimum is not None and spec.maximum is not None and 0 < spec.minimum < spec.maximum
            if spec.kind == "choice":
                assert spec.choices
            if spec.kind == "secret":
                assert not spec.public, f"{spec.key} is a secret and must never be public"
                assert spec.allowed_hosts

    def test_the_defaults_pass_their_own_validation(self) -> None:
        for spec in SETTING_SPECS:
            if spec.kind == "secret":
                continue
            default = site_settings._FALLBACK_DEFAULTS[spec.key]
            if default == "" and spec.allow_empty:
                continue
            if default == "" and spec.kind in ("text", "email"):
                continue
            assert validate_setting(spec.key, default) == default, spec.key

    def test_limits_keep_a_floor_and_a_ceiling(self) -> None:
        # a floor stops a typo from locking honest visitors out, a ceiling from switching a limit off
        assert SPEC_BY_KEY["rate_auth_per_minute"].minimum >= 3
        assert SPEC_BY_KEY["two_factor_max_attempts"].maximum <= 10
        assert SPEC_BY_KEY["two_factor_lockout_minutes"].minimum >= 5
        assert SPEC_BY_KEY["password_min_length"].minimum == 6

    def test_retention_can_only_be_shortened(self) -> None:
        assert SPEC_BY_KEY["content_evidence_days"].maximum == 14
        assert SPEC_BY_KEY["match_log_max_entries"].maximum == 100
        assert SPEC_BY_KEY["scoreboard_upload_max_mb"].maximum == 8
        assert SPEC_BY_KEY["smash_image_max_mb"].maximum == 5
        with pytest.raises(ValueError):
            validate_setting("content_evidence_days", 15)

    def test_only_protection_lowering_switches_are_risky(self) -> None:
        assert RISKY_KEYS == {"email_verification_required", "altcha_enforced"}
        assert is_risky_change("altcha_enforced", False) is True
        assert is_risky_change("altcha_enforced", True) is False
        assert is_risky_change("registration_open", False) is False


@pytest.mark.unit
class TestValueKinds:
    @pytest.mark.parametrize(
        "raw",
        [
            "http://ko-fi.com/x",
            "javascript:alert(1)",
            "https://user:pass@ko-fi.com/x",
            "https://ko-fi.com:8443/x",
            "https://ko-fi.com/a b",
            "https://localhost/x",
            "ko-fi.com/x",
            "//ko-fi.com/x",
            "https://ko-fi.com/" + "a" * 400,
        ],
    )
    def test_links_are_https_only_and_plain(self, raw: str) -> None:
        with pytest.raises(ValueError):
            validate_setting("donation_kofi_url", raw)

    def test_links_accept_a_normal_https_address_or_nothing(self) -> None:
        assert validate_setting("donation_kofi_url", "  https://ko-fi.com/lemondbd ") == "https://ko-fi.com/lemondbd"
        assert validate_setting("donation_kofi_url", "") == ""

    def test_discord_invite_must_be_a_discord_address(self) -> None:
        assert validate_setting("discord_invite_url", "https://discord.gg/abc123") == "https://discord.gg/abc123"
        with pytest.raises(ValueError):
            validate_setting("discord_invite_url", "https://evil.example.com/abc123")
        with pytest.raises(ValueError):
            validate_setting("discord_invite_url", "https://discord.gg.evil.example.com/abc")

    def test_webhooks_must_be_discord_webhook_urls(self) -> None:
        assert validate_setting("discord_webhook_url", WEBHOOK) == WEBHOOK
        for bad in (
            "",
            "https://evil.example.com/api/webhooks/1/x",
            "https://discord.com/not-a-webhook",
            "http://discord.com/api/webhooks/1/x",
            "https://discord.com.evil.example.com/api/webhooks/1/x",
        ):
            with pytest.raises(ValueError):
                validate_setting("discord_webhook_url", bad)

    def test_text_is_one_clean_line(self) -> None:
        assert validate_setting("site_banner_text", "  Maintenance   at  22:00 ") == "Maintenance at 22:00"
        assert validate_setting("site_banner_text", "line one\nline two") == "line one line two"
        with pytest.raises(ValueError):
            validate_setting("site_banner_text", "bell\x07")
        with pytest.raises(ValueError):
            validate_setting("site_banner_text", "x" * 241)

    def test_choice(self) -> None:
        assert validate_setting("site_banner_level", " Warning ") == "warning"
        with pytest.raises(ValueError):
            validate_setting("site_banner_level", "purple")

    def test_datetime_is_stored_as_utc(self) -> None:
        assert validate_setting("site_banner_until", "2026-12-24T20:00:00+02:00") == "2026-12-24T18:00:00Z"
        assert validate_setting("site_banner_until", "2026-12-24T18:00:00") == "2026-12-24T18:00:00Z"
        assert validate_setting("site_banner_until", "") == ""
        with pytest.raises(ValueError):
            validate_setting("site_banner_until", "tomorrow")


@pytest.mark.unit
class TestSaving:
    def test_a_risky_change_needs_confirmation_and_a_reason(
        self, client: FlaskClient, admin: User, app: Flask, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", True)
        url = "/api/v1/admin/settings"
        body = {"settings": {"email_verification_required": False}}
        refused = client.put(url, headers=_headers(admin), json=body)
        assert refused.status_code == 400 and refused.get_json()["error_code"] == "confirmation_required"
        no_reason = client.put(url, headers=_headers(admin), json={**body, "confirm_risky": True, "reason": "  "})
        assert no_reason.status_code == 400
        assert site_settings.email_verification_required() is True  # nothing was stored

        ok = client.put(url, headers=_headers(admin), json={**body, "confirm_risky": True, "reason": "ALTCHA outage"})
        assert ok.status_code == 200
        assert site_settings.email_verification_required() is False
        entry = db.session.query(AdminAuditLog).filter_by(action="site_settings_updated").one()
        assert "ALTCHA outage" in str(entry.details)

    def test_use_default_needs_confirmation_when_the_default_is_the_unsafe_value(
        self, client: FlaskClient, admin: User, app: Flask, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setitem(app.config, "ALTCHA_ENFORCED", False)  # this deployment's default is "off"
        site_settings.update_settings({"altcha_enforced": True})
        assert site_settings.altcha_enforced() is True
        url = "/api/v1/admin/settings"
        refused = client.put(url, headers=_headers(admin), json={"settings": {"altcha_enforced": None}})
        assert refused.status_code == 400 and refused.get_json()["error_code"] == "confirmation_required"
        assert site_settings.altcha_enforced() is True
        ok = client.put(url, headers=_headers(admin), json={"settings": {"altcha_enforced": None}, "confirm_risky": True, "reason": "check is broken"})
        assert ok.status_code == 200
        assert site_settings.altcha_enforced() is False

    def test_use_default_needs_no_confirmation_when_the_default_is_safe(self, admin: User, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "ALTCHA_ENFORCED", True)
        site_settings.update_settings({"altcha_enforced": False}, confirm_risky=True, reason="for the test")
        site_settings.update_settings({"altcha_enforced": None})
        assert site_settings.altcha_enforced() is True

    def test_tightening_never_needs_confirmation(self, admin: User) -> None:
        site_settings.update_settings({"altcha_enforced": True, "email_verification_required": True})

    def test_the_whole_batch_is_refused_when_one_entry_is_invalid(self) -> None:
        with pytest.raises(ValueError):
            site_settings.update_settings({"session_hours": 48, "rate_auth_per_minute": 1})
        assert site_settings.session_lifetime() == timedelta(hours=24)

    def test_the_banner_cannot_be_switched_on_without_text(self) -> None:
        with pytest.raises(ValueError):
            site_settings.update_settings({"site_banner_enabled": True})
        site_settings.update_settings({"site_banner_enabled": True, "site_banner_text": "Down for maintenance"})
        assert site_settings.get_setting("site_banner_enabled") is True

    def test_only_admins_can_save_or_list(self, client: FlaskClient, player: User) -> None:
        assert client.get("/api/v1/admin/settings", headers=_headers(player)).status_code in (401, 403)
        assert client.put("/api/v1/admin/settings", headers=_headers(player), json={"settings": {"session_hours": 5}}).status_code in (401, 403)
        assert client.put("/api/v1/admin/settings", json={"settings": {"session_hours": 5}}).status_code == 401

    def test_listing_describes_every_field_for_the_form(self, client: FlaskClient, admin: User) -> None:
        rows = {r["key"]: r for r in client.get("/api/v1/admin/settings", headers=_headers(admin)).get_json()["settings"]}
        assert set(rows) == set(SPEC_BY_KEY)
        assert rows["site_banner_level"]["choices"] == ["info", "warning", "critical"]
        assert rows["site_banner_text"]["max_length"] == 240
        assert rows["altcha_enforced"]["risky_when"] is False
        assert rows["registration_open"]["risky_when"] is None


@pytest.mark.unit
class TestSecrets:
    def test_stored_encrypted_and_never_listed(self, client: FlaskClient, admin: User) -> None:
        res = client.put("/api/v1/admin/settings", headers=_headers(admin), json={"settings": {"discord_webhook_url": WEBHOOK}})
        assert res.status_code == 200

        stored = db.session.query(SiteSetting).filter_by(key="discord_webhook_url").one().value
        assert stored != WEBHOOK and "discord.com" not in stored and "secret_value" not in stored

        listing = client.get("/api/v1/admin/settings", headers=_headers(admin))
        assert "secret_value" not in listing.get_data(as_text=True)
        row = next(r for r in listing.get_json()["settings"] if r["key"] == "discord_webhook_url")
        assert row["value"] is None and row["default"] is None and row["overridden"] is True
        assert "secret_value" not in res.get_data(as_text=True)

        audit = db.session.query(AdminAuditLog).filter_by(action="site_settings_updated").one()
        assert "secret_value" not in str(audit.details)

    def test_the_stored_value_is_used_and_clearing_restores_the_deployment_value(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/1/from-env")
        assert discord_webhook.webhook_url() == "https://discord.com/api/webhooks/1/from-env"
        site_settings.update_settings({"discord_webhook_url": WEBHOOK})
        assert discord_webhook.webhook_url() == WEBHOOK
        site_settings.update_settings({"discord_webhook_url": None})
        assert discord_webhook.webhook_url() == "https://discord.com/api/webhooks/1/from-env"

    def test_get_setting_never_returns_a_secret(self) -> None:
        site_settings.update_settings({"discord_webhook_url": WEBHOOK})
        assert site_settings.get_setting("discord_webhook_url") == ""

    def test_refuses_to_store_without_an_encryption_key(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", "")
        with pytest.raises(ValueError, match="ENCRYPTION_KEY"):
            site_settings.update_settings({"discord_webhook_url": WEBHOOK})
        assert db.session.query(SiteSetting).filter_by(key="discord_webhook_url").count() == 0

    def test_an_undecryptable_row_falls_back_instead_of_failing(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)
        db.session.add(SiteSetting(key="discord_webhook_url", value="not-a-fernet-token"))
        db.session.commit()
        assert site_settings.get_secret("discord_webhook_url") == (app.config.get("DISCORD_WEBHOOK_URL") or "")


@pytest.mark.unit
class TestPublicConfig:
    URL = "/api/v1/site-config"

    def test_is_public_and_short_cached(self, client: FlaskClient) -> None:
        res = client.get(self.URL)
        assert res.status_code == 200
        assert "max-age" in res.headers["Cache-Control"] and "public" in res.headers["Cache-Control"]
        assert set(res.get_json()) == {"banner", "links", "features", "limits"}

    def test_banner_off_carries_no_text(self, client: FlaskClient) -> None:
        site_settings.update_settings({"site_banner_text": "Secret draft"})
        body = client.get(self.URL).get_json()
        assert body["banner"] == {"active": False}
        assert "Secret draft" not in str(body)

    def test_banner_on_with_localised_text(self, client: FlaskClient) -> None:
        site_settings.update_settings({
            "site_banner_enabled": True,
            "site_banner_level": "warning",
            "site_banner_text": "Maintenance tonight",
            "site_banner_text_pl": "Prace serwisowe dziś wieczorem",
        })
        banner = client.get(self.URL).get_json()["banner"]
        assert banner["active"] is True and banner["level"] == "warning" and banner["until"] is None
        assert banner["text"] == {"en": "Maintenance tonight", "pl": "Prace serwisowe dziś wieczorem"}

    def test_an_expired_banner_disappears(self, client: FlaskClient) -> None:
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        site_settings.update_settings({"site_banner_enabled": True, "site_banner_text": "Notice", "site_banner_until": past})
        assert client.get(self.URL).get_json()["banner"] == {"active": False}
        site_settings.update_settings({"site_banner_until": future})
        banner = client.get(self.URL).get_json()["banner"]
        assert banner["active"] is True and banner["until"] == future

    def test_links_start_from_the_config_and_can_be_changed_or_hidden(self, client: FlaskClient, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "DONATION_KOFI_URL", "https://ko-fi.com/from-config")
        assert client.get(self.URL).get_json()["links"]["donation_kofi"] == "https://ko-fi.com/from-config"
        site_settings.update_settings({"donation_kofi_url": "https://ko-fi.com/new", "donation_patreon_url": ""})
        links = client.get(self.URL).get_json()["links"]
        assert links["donation_kofi"] == "https://ko-fi.com/new"
        assert links["donation_patreon"] is None  # an empty link is hidden

    def test_feature_flags_follow_the_switches(self, client: FlaskClient, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com")
        features = client.get(self.URL).get_json()["features"]
        assert features["registration_open"] is True and features["google_sign_in"] is True
        site_settings.update_settings({"registration_open": False, "google_sign_in_enabled": False})
        features = client.get(self.URL).get_json()["features"]
        assert features["registration_open"] is False and features["google_sign_in"] is False

    def test_the_guest_bug_report_switch_is_public(self, client: FlaskClient) -> None:
        """The form needs it up front, to ask a signed-out visitor to sign in instead."""
        assert client.get(self.URL).get_json()["features"]["guest_bug_reports"] is True
        site_settings.update_settings({"guest_bug_reports": False})
        assert client.get(self.URL).get_json()["features"]["guest_bug_reports"] is False

    def test_google_is_unavailable_without_a_client_id(self, client: FlaskClient, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "GOOGLE_CLIENT_ID", "")
        assert client.get(self.URL).get_json()["features"]["google_sign_in"] is False

    def test_nothing_private_is_ever_served(self, client: FlaskClient) -> None:
        """Set every non-public setting to a recognisable value; none of it may appear."""
        site_settings.update_settings({
            "contact_email": "private-contact@example.com",
            "discord_webhook_url": WEBHOOK,
            "discord_changelog_webhook_url": WEBHOOK.replace("123456789", "987654321"),
            "rate_auth_per_minute": 77,
            "two_factor_lockout_minutes": 99,
            "session_hours": 77,
            "warnings_before_suspension": 13,
        })
        raw = client.get(self.URL).get_data(as_text=True)
        for needle in ("private-contact", "secret_value", "987654321", "webhooks", "77", "99"):
            assert needle not in raw, needle

    def test_a_secret_setting_is_never_marked_public(self) -> None:
        assert not [s.key for s in SETTING_SPECS if s.kind == "secret" and s.public]


@pytest.mark.unit
class TestCache:
    def test_overrides_are_cached_per_process_and_cleared_on_save(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "SITE_SETTINGS_CACHE_SECONDS", 60)
        site_settings.invalidate_cache()
        try:
            assert site_settings.get_setting("session_hours") == 24
            db.session.add(SiteSetting(key="session_hours", value="48"))
            db.session.commit()
            assert site_settings.get_setting("session_hours") == 24  # served from the cache
            site_settings.update_settings({"reset_token_minutes": 30})  # any save clears it
            assert site_settings.get_setting("session_hours") == 48
        finally:
            site_settings.invalidate_cache()

    def test_no_caching_when_the_ttl_is_zero(self) -> None:
        site_settings.get_setting("session_hours")
        db.session.add(SiteSetting(key="session_hours", value="36"))
        db.session.commit()
        assert site_settings.get_setting("session_hours") == 36

    def test_a_corrupt_stored_value_falls_back_to_the_default(self) -> None:
        db.session.add(SiteSetting(key="session_hours", value="not a number"))
        db.session.commit()
        assert site_settings.get_setting("session_hours") == 24


@pytest.mark.unit
class TestRateLimitProvider:
    def test_follows_the_setting(self) -> None:
        provider = per_minute("rate_auth_per_minute")
        assert provider() == "10 per minute"
        site_settings.update_settings({"rate_auth_per_minute": 4})
        assert provider() == "4 per minute"
        assert per_minute("rate_content_report_per_minute", also="60 per hour")() == "10 per minute; 60 per hour"

    def test_flask_limiter_applies_the_current_number_on_every_request(self) -> None:
        """The decorator takes the provider as-is: lowering the number takes effect without a reload."""
        probe = Flask("limit-probe")
        limiter = Limiter(key_func=lambda: "same-client", app=probe, storage_uri="memory://")
        current = {"n": 3}

        with patch("app.services.site_settings.rate_limit", side_effect=lambda key: current["n"]):
            @probe.route("/ping")
            @limiter.limit(per_minute("rate_auth_per_minute"))
            def ping():
                return jsonify(ok=True)

            client = probe.test_client()
            assert [client.get("/ping").status_code for _ in range(4)] == [200, 200, 200, 429]
            current["n"] = 50  # a new number is a new window: honest traffic recovers at once
            assert client.get("/ping").status_code == 200

    def test_routes_use_the_dynamic_provider(self) -> None:
        import inspect

        from app.routes import auth, auth_google, auth_two_factor, bug_reports, content_moderation, scoreboard

        for module in (auth, auth_google, auth_two_factor, bug_reports, content_moderation, scoreboard):
            assert "per_minute(" in inspect.getsource(module), module.__name__


@pytest.mark.unit
class TestWiring:
    def test_password_length_follows_the_setting(self) -> None:
        from app.services.user.auth import create_user_account

        site_settings.update_settings({"password_min_length": 12})
        with patch("app.services.user.auth.send_verification_email"):
            user, err = create_user_account("pw_short", "pw_short", "pw_short@example.com", "elevenchars")
            assert user is None and "12" in err
            user, err = create_user_account("pw_long", "pw_long", "pw_long@example.com", "twelve-chars")
            assert err is None and user is not None

    def test_verification_can_be_switched_off_and_back_on(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "REQUIRE_EMAIL_VERIFICATION", True)
        assert site_settings.email_verification_required() is True
        site_settings.update_settings({"email_verification_required": False}, confirm_risky=True, reason="mail outage")
        assert site_settings.email_verification_required() is False
        site_settings.update_settings({"email_verification_required": None})
        assert site_settings.email_verification_required() is True  # back to the deployment's value

    def test_altcha_follows_the_setting(self) -> None:
        from app.core.altcha_guard import altcha_enforced, altcha_rejection

        assert altcha_enforced() is False  # the test config starts it off
        site_settings.update_settings({"altcha_enforced": True})
        assert altcha_enforced() is True
        assert altcha_rejection({}) is not None  # no solution in the body: refused

    def test_wrong_verification_codes_follow_the_attempt_limit(self) -> None:
        from app.services.user.auth import verify_email_code

        site_settings.update_settings({"verification_max_attempts": 3})
        user = User(
            login="vattempt", username="vattempt", email="vattempt@example.com", password_hash="h",
            verification_code="123456", verification_code_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.session.add(user)
        db.session.commit()
        assert verify_email_code("vattempt@example.com", "000000")[1] != "Too many incorrect attempts. Please request a new code."
        verify_email_code("vattempt@example.com", "000001")
        _, message = verify_email_code("vattempt@example.com", "000002")
        assert "Too many" in message

    def test_two_factor_lockout_follows_the_settings(self, client: FlaskClient, db_session) -> None:
        from app.models import UserTwoFactor  # noqa: F401  (table must exist)
        from tests.unit.test_two_factor_flow import _challenge, _enrol, _finish, _make_user, _next_code

        site_settings.update_settings({"two_factor_max_attempts": 3, "two_factor_lockout_minutes": 5})
        user = _make_user("lockuser")
        secret, _ = _enrol(client, user)
        challenge = _challenge(client, user)
        wrong = "000000" if _next_code(secret) != "000000" else "111111"
        assert [_finish(client, challenge, wrong).status_code for _ in range(2)] == [401, 401]
        locked = _finish(client, challenge, wrong)
        assert locked.status_code == 429
        assert 0 < int(locked.headers["Retry-After"]) <= 300

    def test_closed_content_reports_answer_503(self, client: FlaskClient, player: User) -> None:
        site_settings.update_settings({"content_reports_open": False})
        res = client.post("/api/v1/content/reports", headers=_headers(player), json={})
        assert res.status_code == 503 and res.get_json()["error_code"] == "reports_closed"

    def test_google_sign_in_switched_off(self, client: FlaskClient, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com")
        site_settings.update_settings({"google_sign_in_enabled": False})
        res = client.post("/api/v1/auth/google", json={"credential": "anything"})
        assert res.status_code == 503

    def test_google_button_config_follows_the_switch(self, client: FlaskClient, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com")
        assert client.get("/api/v1/auth/google/config").get_json()["enabled"] is True
        site_settings.update_settings({"google_sign_in_enabled": False})
        assert client.get("/api/v1/auth/google/config").get_json()["enabled"] is False

    def test_ocr_switch_hides_the_feature(self, client: FlaskClient) -> None:
        site_settings.update_settings({"scoreboard_ocr_enabled": False})
        assert client.get("/api/v1/scoreboard/status").get_json()["available"] is False

    def test_upload_cap_follows_the_setting(self, client: FlaskClient) -> None:
        site_settings.update_settings({"scoreboard_upload_max_mb": 2})
        assert client.get("/api/v1/scoreboard/status").get_json()["max_bytes"] == 2 * 1024 * 1024

    def test_evidence_lifetime_is_capped_by_the_policy(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from app.services import content_moderation_service as service

        assert service.evidence_days() == 14
        site_settings.update_settings({"content_evidence_days": 3})
        assert service.evidence_days() == 3
        monkeypatch.setattr(service, "EVIDENCE_TTL_DAYS", 2)  # the ceiling wins if the policy shrinks
        assert service.evidence_days() == 2

    def test_match_log_and_email_retries_never_exceed_their_ceilings(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from app.services import match_log_retention, sanction_outbox

        assert match_log_retention.max_logged_matches() == 100
        site_settings.update_settings({"match_log_max_entries": 40, "sanction_email_attempts": 2})
        assert match_log_retention.max_logged_matches() == 40
        assert sanction_outbox.max_attempts() == 2
        monkeypatch.setattr(match_log_retention, "MAX_LOGGED_MATCHES", 10)
        assert match_log_retention.max_logged_matches() == 10

    def test_system_status_reports_the_effective_switches(self) -> None:
        from app.services.system_status import system_checks

        site_settings.update_settings({"altcha_enforced": True})
        altcha = next(c for c in system_checks() if c["key"] == "altcha")
        assert altcha["state"] == "ok"


@pytest.mark.unit
def test_every_banner_locale_has_its_own_setting() -> None:
    for code in BANNER_LOCALES:
        assert f"site_banner_text_{code}" in SPEC_BY_KEY


@pytest.mark.unit
def test_risky_error_type_is_a_value_error() -> None:
    assert issubclass(RiskyChangeError, ValueError)
    assert hash_password and totp  # imported helpers used by the 2FA-based test
