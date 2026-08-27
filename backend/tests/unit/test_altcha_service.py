# backend/tests/unit/test_altcha_service.py
import hashlib
import hmac
import time
import pytest
from app.services.altcha_service import AltchaService


def _solve_challenge(challenge_data: dict) -> int:
    """Helper to solve ALTCHA PoW by brute forcing secret number."""
    salt = challenge_data["salt"]
    target_challenge = challenge_data["challenge"]
    max_num = challenge_data.get("maxnumber", 50000)

    for n in range(max_num + 1):
        h = hashlib.sha256(f"{salt}{n}".encode("utf-8")).hexdigest()
        if h == target_challenge:
            return n
    raise ValueError(f"Could not find solution up to {max_num}")


def test_altcha_create_challenge():
    secret_key = "test-secret-key-altcha"
    challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=300)

    assert isinstance(challenge, dict)
    assert challenge["algorithm"] == "SHA-256"
    assert "challenge" in challenge
    assert len(challenge["challenge"]) == 64  # SHA-256 hex length
    assert "salt" in challenge
    assert len(challenge["salt"]) >= 16  # Random hex salt
    assert challenge["maxnumber"] == 1000
    assert challenge["expires"] > time.time()
    assert "signature" in challenge
    assert len(challenge["signature"]) == 64

    # Verify signature format
    expected_sig_payload = f"{challenge['challenge']}:{challenge['salt']}:{challenge['maxnumber']}:{challenge['expires']}"
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        expected_sig_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    assert challenge["signature"] == expected_signature


def test_altcha_solve_and_verify_success():
    secret_key = "test-secret-key-solve"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is True
    assert err == ""


def test_altcha_verify_invalid_number():
    secret_key = "test-secret-key-invalid-num"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)
    wrong_number = solved_number + 1

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": wrong_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert len(err) > 0


def test_altcha_verify_expired_challenge():
    secret_key = "test-secret-key-expired"
    # Create an already expired challenge
    challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=-10)

    solved_number = _solve_challenge(challenge)

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": challenge["signature"],
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "expired" in err.lower()


def test_altcha_verify_tampered_signature():
    secret_key = "test-secret-key-tamper"
    challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

    solved_number = _solve_challenge(challenge)

    # Modify the signature
    tampered_signature = "a" + challenge["signature"][1:] if challenge["signature"][0] != "a" else "b" + challenge["signature"][1:]

    payload = {
        "algorithm": challenge["algorithm"],
        "challenge": challenge["challenge"],
        "number": solved_number,
        "salt": challenge["salt"],
        "signature": tampered_signature,
        "expires": challenge["expires"],
        "maxnumber": challenge["maxnumber"],
    }

    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert len(err) > 0


def test_altcha_verify_missing_fields():
    secret_key = "test-secret-key"
    payload = {
        "algorithm": "SHA-256",
        "challenge": "abc",
        # missing number, salt, signature, expires
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "Missing required field" in err


def test_altcha_verify_wrong_algorithm():
    secret_key = "test-secret-key"
    payload = {
        "algorithm": "MD5",
        "challenge": "abc",
        "number": 123,
        "salt": "salt",
        "signature": "sig",
        "expires": int(time.time()) + 100,
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is False
    assert "algorithm" in err.lower()


def test_altcha_challenge_route(client, app):
    response = client.get("/api/v1/auth/altcha-challenge")
    assert response.status_code == 200
    data = response.get_json()

    assert data["algorithm"] == "SHA-256"
    assert "challenge" in data
    assert "salt" in data
    assert "maxnumber" in data
    assert "signature" in data
    assert "expires" in data

    # Verify that the generated challenge solves and verifies with app's SECRET_KEY
    secret_key = app.config.get("SECRET_KEY")
    solved_number = _solve_challenge(data)
    payload = {
        "algorithm": data["algorithm"],
        "challenge": data["challenge"],
        "number": solved_number,
        "salt": data["salt"],
        "signature": data["signature"],
        "expires": data["expires"],
        "maxnumber": data["maxnumber"],
    }
    is_valid, err = AltchaService.verify_solution(payload, secret_key)
    assert is_valid is True
    assert err == ""
