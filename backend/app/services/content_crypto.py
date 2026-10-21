"""Deterministic canonicalization and HMAC content signing/verification service.

Used for user-generated content moderation (e.g. tier lists, builds).
"""
import logging
import hashlib
import hmac
import json
from typing import Any

logger = logging.getLogger(__name__)


def canonicalize_payload(payload: dict[str, Any]) -> str:
    """Produce a deterministic, compact canonical JSON string with sorted keys.

    Args:
        payload: Dictionary containing user-generated content data.

    Returns:
        Deterministic compact JSON string without extraneous whitespace.

    Raises:
        TypeError: If payload is not a dict.
        ValueError: If payload contains NaN or Infinity.
    """
    if not isinstance(payload, dict):
        raise TypeError(f"payload must be a dict, got {type(payload).__name__}")
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def compute_content_hash(canonical_str: str) -> str:
    """Compute the SHA-256 hexdigest of a canonical string.

    Args:
        canonical_str: Deterministic canonical content string.

    Returns:
        64-character hexadecimal SHA-256 digest.

    Raises:
        TypeError: If canonical_str is not a str.
    """
    if not isinstance(canonical_str, str):
        raise TypeError(f"canonical_str must be a str, got {type(canonical_str).__name__}")
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def sign_content(user_id: int, content_hash: str, secret_key: str) -> str:
    """Sign user_id and content_hash using HMAC-SHA256 with the server secret key.

    Args:
        user_id: Positive integer ID of the authoring user.
        content_hash: SHA-256 digest of the canonical content.
        secret_key: Secret key string for HMAC signing.

    Returns:
        64-character hexadecimal HMAC-SHA256 signature.

    Raises:
        ValueError: If user_id is non-positive or arguments are empty/invalid.
    """
    if not isinstance(user_id, int) or isinstance(user_id, bool) or user_id <= 0:
        raise ValueError("user_id must be a positive integer")
    if not content_hash or not isinstance(content_hash, str):
        raise ValueError("content_hash is required and must be a string")
    if not secret_key or not isinstance(secret_key, str):
        raise ValueError("secret_key is required and must be a string")

    message = f"{user_id}:{content_hash}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_content_signature(
    user_id: int | None,
    content_hash: str | None,
    signature: str | None,
    secret_key: str | None,
) -> bool:
    """Safe constant-time verification of HMAC-SHA256 content signature.

    Args:
        user_id: Integer user ID claiming authorship.
        content_hash: Content SHA-256 hash.
        signature: Hexadecimal HMAC-SHA256 signature to verify.
        secret_key: Secret key string used during signing.

    Returns:
        True if the signature is valid and authentic, False otherwise.
    """
    if (
        user_id is None
        or not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
        or not content_hash
        or not isinstance(content_hash, str)
        or not signature
        or not isinstance(signature, str)
        or not secret_key
        or not isinstance(secret_key, str)
    ):
        return False

    try:
        clean_hash = content_hash.strip().lower()
        expected_sig = sign_content(user_id, clean_hash, secret_key)
        return hmac.compare_digest(signature.strip().lower(), expected_sig.lower())
    except Exception:
        logger.debug("Content signature check failed on malformed input", exc_info=True)
        return False

