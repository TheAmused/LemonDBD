# backend/tests/unit/test_two_factor_core.py
"""TOTP maths (RFC 4226 / 6238 test vectors), provisioning URI and secret encryption."""
import base64
from urllib.parse import parse_qs, urlsplit

import pytest
from flask import Flask

from app.core import totp
from app.core.two_factor_crypto import TwoFactorUnavailable, decrypt_secret, encrypt_secret, is_configured

# RFC 4226 / 6238 appendix secret: the ASCII string "12345678901234567890".
RFC_SECRET = base64.b32encode(b"12345678901234567890").decode().rstrip("=")


@pytest.mark.unit
class TestTotp:
    @pytest.mark.parametrize(
        "counter, expected",
        enumerate(["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]),
    )
    def test_rfc4226_hotp_vectors(self, counter: int, expected: str) -> None:
        assert totp.hotp(RFC_SECRET, counter) == expected

    @pytest.mark.parametrize(
        "now, expected",
        [(59, "94287082"), (1111111109, "07081804"), (1111111111, "14050471"),
         (1234567890, "89005924"), (2000000000, "69279037"), (20000000000, "65353130")],
    )
    def test_rfc6238_sha1_vectors(self, now: int, expected: str) -> None:
        assert totp.hotp(RFC_SECRET, totp.current_step(now), digits=8) == expected

    def test_generated_secrets_are_random_unpadded_base32_of_160_bits(self) -> None:
        a, b = totp.generate_secret(), totp.generate_secret()
        assert a != b
        assert "=" not in a and len(a) == 32
        assert len(base64.b32decode(a)) == 20

    def test_window_accepts_neighbouring_steps_but_not_further(self) -> None:
        now = 1_700_000_000
        step = totp.current_step(now)
        for offset, ok in [(-2, False), (-1, True), (0, True), (1, True), (2, False)]:
            assert (totp.match_step(RFC_SECRET, totp.hotp(RFC_SECRET, step + offset), now=now) is not None) is ok

    def test_a_used_step_cannot_be_matched_again(self) -> None:
        now = 1_700_000_000
        step = totp.current_step(now)
        code = totp.hotp(RFC_SECRET, step)
        assert totp.match_step(RFC_SECRET, code, now=now) == step
        assert totp.match_step(RFC_SECRET, code, now=now, after_step=step) is None
        # but the next step is still fine
        assert totp.match_step(RFC_SECRET, totp.hotp(RFC_SECRET, step + 1), now=now, after_step=step) == step + 1

    @pytest.mark.parametrize("typed", ["", None, "12345", "1234567", "abcdef", "12 34 5"])
    def test_malformed_codes_never_match(self, typed: str | None) -> None:
        assert totp.match_step(RFC_SECRET, typed) is None

    def test_spaces_and_dashes_in_a_typed_code_are_ignored(self) -> None:
        now = 1_700_000_000
        code = totp.hotp(RFC_SECRET, totp.current_step(now))
        assert totp.match_step(RFC_SECRET, f"{code[:3]} {code[3:]}", now=now) is not None
        assert totp.match_step(RFC_SECRET, f"{code[:3]}-{code[3:]}", now=now) is not None

    def test_provisioning_uri_carries_what_authenticator_apps_need(self) -> None:
        uri = totp.provisioning_uri("ABCDEFGH", "some user@x.com", "LemonDBD")
        parts = urlsplit(uri)
        assert parts.scheme == "otpauth" and parts.netloc == "totp"
        assert parts.path == "/LemonDBD%3Asome%20user%40x.com"
        query = parse_qs(parts.query)
        assert query == {
            "secret": ["ABCDEFGH"], "issuer": ["LemonDBD"], "algorithm": ["SHA1"], "digits": ["6"], "period": ["30"],
        }


@pytest.mark.unit
class TestSecretEncryption:
    def test_round_trip_and_ciphertext_hides_the_secret(self, app: Flask) -> None:
        secret = totp.generate_secret()
        token = encrypt_secret(secret)
        assert secret not in token
        assert decrypt_secret(token) == secret

    def test_no_key_means_unavailable_not_plaintext(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", "")
        assert is_configured() is False
        with pytest.raises(TwoFactorUnavailable):
            encrypt_secret("ABC")

    def test_malformed_key_means_unavailable(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", "not-a-fernet-key")
        assert is_configured() is False

    def test_rotation_new_key_first_old_key_still_decrypts(self, app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
        from cryptography.fernet import Fernet

        old_key = app.config["TWO_FACTOR_ENCRYPTION_KEY"]
        new_key = Fernet.generate_key().decode()
        token = encrypt_secret("OLDSECRET")
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", f"{new_key},{old_key}")
        assert decrypt_secret(token) == "OLDSECRET"
        # new writes use the first key, so dropping the old one later still reads them
        fresh = encrypt_secret("NEWSECRET")
        monkeypatch.setitem(app.config, "TWO_FACTOR_ENCRYPTION_KEY", new_key)
        assert decrypt_secret(fresh) == "NEWSECRET"
        with pytest.raises(TwoFactorUnavailable):
            decrypt_secret(token)
