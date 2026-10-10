# backend/app/core/two_factor_crypto.py
"""Encryption of TOTP secrets at rest (Fernet, key from TWO_FACTOR_ENCRYPTION_KEY).

The setting is a comma-separated list: the first key encrypts, every key can decrypt, which is
what makes a key rotation possible: put the new key first and keep the old ones listed, so
secrets written under an old key keep decrypting. Dropping an old key locks out everyone whose
secret was written under it (an admin reset, or scripts/reset_two_factor.py, lets them re-enrol).
No key, or a malformed one, means 2FA cannot be used at all: it fails closed instead of storing
secrets in clear text.
"""
from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from flask import current_app


class TwoFactorUnavailable(RuntimeError):
    """TWO_FACTOR_ENCRYPTION_KEY is missing or invalid."""


def _cipher() -> MultiFernet:
    raw = str(current_app.config.get("TWO_FACTOR_ENCRYPTION_KEY") or "")
    keys = [part.strip() for part in raw.split(",") if part.strip()]
    if not keys:
        raise TwoFactorUnavailable("TWO_FACTOR_ENCRYPTION_KEY is not set")
    try:
        return MultiFernet([Fernet(key.encode("ascii")) for key in keys])
    except (ValueError, UnicodeEncodeError) as err:
        raise TwoFactorUnavailable("TWO_FACTOR_ENCRYPTION_KEY is not a valid Fernet key list") from err


def is_configured() -> bool:
    try:
        _cipher()
    except TwoFactorUnavailable:
        return False
    return True


def encrypt_secret(plain: str) -> str:
    return _cipher().encrypt(plain.encode("ascii")).decode("ascii")


def decrypt_secret(token: str) -> str:
    try:
        return _cipher().decrypt(token.encode("ascii")).decode("ascii")
    except InvalidToken as err:
        raise TwoFactorUnavailable("a stored 2FA secret cannot be decrypted with the configured keys") from err
