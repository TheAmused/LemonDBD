# backend/app/services/altcha_service.py
import hashlib
import hmac
import logging
import secrets
import time
from typing import Any, Dict, Tuple

logger = logging.getLogger(__name__)


class AltchaService:
    """
    ALTCHA Proof-of-Work service for anti-bot & DDoS protection.
    Generates challenges and verifies PoW solutions using SHA-256 and HMAC-SHA256.
    """

    @staticmethod
    def create_challenge(
        secret_key: str,
        max_number: int = 50000,
        expires_in_seconds: int = 300,
    ) -> Dict[str, Any]:
        """
        Generates an ALTCHA challenge payload.

        Args:
            secret_key: Server secret key used for HMAC signing.
            max_number: Maximum integer number the client needs to search up to.
            expires_in_seconds: Challenge validity period in seconds (default 300 = 5 mins).

        Returns:
            Dict containing algorithm, challenge, salt, maxnumber, signature, and expires.
        """
        if not secret_key:
            raise ValueError("secret_key is required to create an ALTCHA challenge")

        salt = secrets.token_hex(12)
        secret_number = secrets.randbelow(max_number + 1)
        challenge = hashlib.sha256(f"{salt}{secret_number}".encode("utf-8")).hexdigest()
        expires = int(time.time()) + expires_in_seconds

        signature_payload = f"{challenge}:{salt}:{max_number}:{expires}"
        signature = hmac.new(
            secret_key.encode("utf-8"),
            signature_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return {
            "algorithm": "SHA-256",
            "challenge": challenge,
            "salt": salt,
            "maxnumber": max_number,
            "signature": signature,
            "expires": expires,
        }

    @staticmethod
    def verify_solution(payload: Dict[str, Any], secret_key: str) -> Tuple[bool, str]:
        """
        Validates an ALTCHA solution payload.

        Validates:
        1. Payload has all required fields (algorithm, challenge, number, salt, signature, expires).
        2. algorithm == "SHA-256".
        3. time.time() <= expires.
        4. HMAC-SHA256 signature matches expected signature.
        5. SHA256(f"{salt}{number}") == challenge.

        Returns:
            (True, "") on success or (False, "Error description") on failure.
        """
        if not secret_key:
            return False, "Missing secret key for ALTCHA verification."

        if not isinstance(payload, dict):
            return False, "Invalid ALTCHA payload: must be a JSON object."

        required_fields = ["algorithm", "challenge", "number", "salt", "signature", "expires"]
        for field in required_fields:
            if field not in payload or payload[field] is None:
                return False, f"Missing required field: {field}"

        if payload.get("algorithm") != "SHA-256":
            return False, f"Unsupported algorithm: '{payload.get('algorithm')}'. Only SHA-256 is supported."

        try:
            expires = float(payload["expires"])
        except (ValueError, TypeError):
            return False, "Invalid expires timestamp."

        if time.time() > expires:
            return False, "ALTCHA challenge has expired."

        challenge = str(payload["challenge"])
        salt = str(payload["salt"])
        signature = str(payload["signature"])
        maxnumber = payload.get("maxnumber", payload.get("max_number", ""))
        expires_val = payload["expires"]

        expected_sig_payload = f"{challenge}:{salt}:{maxnumber}:{expires_val}"
        expected_signature = hmac.new(
            secret_key.encode("utf-8"),
            expected_sig_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature.lower(), expected_signature.lower()):
            return False, "Invalid signature or challenge parameters have been tampered with."

        number = payload["number"]
        computed_hash = hashlib.sha256(f"{salt}{number}".encode("utf-8")).hexdigest()
        if not hmac.compare_digest(computed_hash.lower(), challenge.lower()):
            return False, "Invalid proof-of-work solution: computed hash does not match challenge."

        return True, ""
