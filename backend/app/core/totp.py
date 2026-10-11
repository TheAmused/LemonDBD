# backend/app/core/totp.py
"""TOTP (RFC 6238) with HOTP (RFC 4226) underneath, on the standard library only.

SHA-1, 6 digits, 30-second steps: the profile every authenticator app (Google Authenticator,
Microsoft Authenticator, Apple Passwords, Authy, 1Password, ...) implements.
"""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode

DIGITS = 6
PERIOD = 30
SECRET_BYTES = 20  # 160 bits, the size RFC 4226 recommends
DEFAULT_WINDOW = 1  # also accept the neighbouring steps: phone clocks drift


def generate_secret() -> str:
    """A fresh random secret as unpadded base32 (what apps and otpauth:// URIs expect)."""
    return base64.b32encode(secrets.token_bytes(SECRET_BYTES)).decode("ascii").rstrip("=")


def _decode_secret(secret: str) -> bytes:
    cleaned = secret.replace(" ", "").replace("-", "").upper()
    return base64.b32decode(cleaned + "=" * (-len(cleaned) % 8))


def hotp(secret: str, counter: int, digits: int = DIGITS) -> str:
    digest = hmac.new(_decode_secret(secret), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(binary % 10**digits).zfill(digits)


def current_step(now: float | None = None) -> int:
    return int((time.time() if now is None else now) // PERIOD)


def totp(secret: str, now: float | None = None) -> str:
    return hotp(secret, current_step(now))


def normalize_code(code: str | None) -> str:
    """The digits of what a person typed (spaces and dashes are ignored)."""
    return "".join(ch for ch in (code or "") if ch.isdigit())


def match_step(
    secret: str,
    code: str | None,
    now: float | None = None,
    window: int = DEFAULT_WINDOW,
    after_step: int = 0,
) -> int | None:
    """The step `code` is valid for, or None.

    Only steps greater than `after_step` count, so a code that was already accepted (or an older
    one) cannot be replayed. Every candidate is compared in constant time.
    """
    digits = normalize_code(code)
    if len(digits) != DIGITS:
        return None
    step_now = current_step(now)
    matched: int | None = None
    for step in range(step_now - window, step_now + window + 1):
        if step > after_step and hmac.compare_digest(hotp(secret, step), digits):
            matched = step
    return matched


def provisioning_uri(secret: str, account: str, issuer: str = "LemonDBD") -> str:
    """The otpauth:// URI an authenticator app reads from the QR code."""
    label = quote(f"{issuer}:{account}", safe="")
    query = urlencode(
        {"secret": secret, "issuer": issuer, "algorithm": "SHA1", "digits": DIGITS, "period": PERIOD},
        quote_via=quote,
    )
    return f"otpauth://totp/{label}?{query}"
