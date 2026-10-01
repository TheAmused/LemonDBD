# backend/tests/unit/test_site_settings_spec.py
import pytest

from app.utils.durations import describe_duration
from app.utils.privacy_info import build_privacy_info, mail_provider_name
from app.utils.site_settings_spec import SETTING_SPECS, validate_setting
from datetime import timedelta


@pytest.mark.unit
class TestValidateSetting:
    def test_integers_within_bounds(self) -> None:
        assert validate_setting("session_hours", "48") == 48
        assert validate_setting("session_hours", 1) == 1
        assert validate_setting("streak_prune_days", 3650) == 3650

    @pytest.mark.parametrize(
        "key,raw",
        [
            ("session_hours", 0),
            ("session_hours", 721),
            ("reset_token_minutes", 4),
            ("verification_code_hours", 169),
            ("streak_prune_days", 6),
            ("session_hours", "abc"),
            ("session_hours", 2.5),
            ("session_hours", True),
            ("session_hours", None),
        ],
    )
    def test_rejects_out_of_range_or_non_integers(self, key: str, raw: object) -> None:
        with pytest.raises(ValueError):
            validate_setting(key, raw)

    def test_email(self) -> None:
        assert validate_setting("contact_email", "  team@example.com ") == "team@example.com"
        for bad in ("", "nope", "a@b", "x@y .com", None):
            with pytest.raises(ValueError):
                validate_setting("contact_email", bad)

    def test_unknown_key(self) -> None:
        with pytest.raises(ValueError):
            validate_setting("nope", 1)

    def test_every_spec_has_sane_bounds(self) -> None:
        for spec in SETTING_SPECS:
            if spec.kind == "int":
                assert spec.minimum is not None and spec.maximum is not None
                assert 0 < spec.minimum < spec.maximum


@pytest.mark.unit
class TestPrivacyInfo:
    def test_provider_names(self) -> None:
        assert mail_provider_name("smtp.gmail.com") == "Google Gmail"
        assert mail_provider_name("smtp.office365.com") == "Microsoft Outlook"
        assert mail_provider_name("mail.example.org") == "mail.example.org"
        assert mail_provider_name("") == ""

    def test_builds_seconds(self) -> None:
        info = build_privacy_info(
            contact_email=" team@example.com ",
            mail_server="smtp.gmail.com",
            verification_lifetime=timedelta(hours=24),
            reset_lifetime=timedelta(minutes=60),
            session_lifetime=timedelta(hours=24),
            streak_prune_days=90,
        )
        assert info == {
            "contactEmail": "team@example.com",
            "mailProvider": "Google Gmail",
            "verificationSeconds": 86400,
            "resetSeconds": 3600,
            "sessionSeconds": 86400,
            "streakPruneSeconds": 90 * 86400,
        }


@pytest.mark.unit
def test_describe_duration() -> None:
    assert describe_duration(timedelta(hours=24)) == "24 hours"
    assert describe_duration(timedelta(hours=1)) == "1 hour"
    assert describe_duration(timedelta(minutes=90)) == "90 minutes"
    assert describe_duration(timedelta(minutes=1)) == "1 minute"
    assert describe_duration(timedelta(seconds=10)) == "1 minute"
