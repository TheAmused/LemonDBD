# backend/tests/unit/test_altcha_service.py
import hashlib
import hmac
import time
import pytest
from typing import Any
from app.services.altcha_service import AltchaService


def _solve_challenge(challenge_data: dict[str, Any]) -> int:
    """Helper to solve ALTCHA PoW by brute-forcing secret number."""
    salt = challenge_data["salt"]
    target_challenge = challenge_data["challenge"]
    max_num = challenge_data.get("maxnumber", 50000)

    for n in range(max_num + 1):
        h = hashlib.sha256(f"{salt}{n}".encode("utf-8")).hexdigest()
        if h == target_challenge:
            return n
    raise ValueError(f"Could not find solution up to {max_num}")


@pytest.mark.unit
class TestAltchaChallengeGeneration:
    """Tests for ALTCHA challenge generation and signature creation."""

    def test_altcha_create_challenge_structure_and_signature(self) -> None:
        secret_key = "test-secret-key-altcha"
        challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=300)

        assert isinstance(challenge, dict)
        assert challenge["algorithm"] == "SHA-256"
        assert "challenge" in challenge
        assert len(challenge["challenge"]) == 64
        assert "salt" in challenge
        assert len(challenge["salt"]) >= 16
        assert challenge["maxnumber"] == 1000
        assert challenge["expires"] > time.time()
        assert "signature" in challenge
        assert len(challenge["signature"]) == 64

        expected_sig_payload = f"{challenge['challenge']}:{challenge['salt']}:{challenge['maxnumber']}:{challenge['expires']}"
        expected_signature = hmac.new(
            secret_key.encode("utf-8"),
            expected_sig_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        assert challenge["signature"] == expected_signature

    @pytest.mark.parametrize("max_number", [1, 50, 500, 10000])
    def test_altcha_create_challenge_varying_max_numbers(self, max_number: int) -> None:
        secret_key = "param-secret-key"
        challenge = AltchaService.create_challenge(secret_key, max_number=max_number, expires_in_seconds=60)
        assert challenge["maxnumber"] == max_number
        solved_num = _solve_challenge(challenge)
        assert 0 <= solved_num <= max_number

    def test_altcha_create_challenge_unique_salts(self) -> None:
        secret_key = "salt-uniqueness-key"
        c1 = AltchaService.create_challenge(secret_key, max_number=500, expires_in_seconds=60)
        c2 = AltchaService.create_challenge(secret_key, max_number=500, expires_in_seconds=60)
        assert c1["salt"] != c2["salt"]
        assert c1["challenge"] != c2["challenge"]


@pytest.mark.unit
class TestAltchaVerification:
    """Tests for ALTCHA proof-of-work verification and boundary error paths."""

    def test_altcha_solve_and_verify_success(self) -> None:
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

    def test_altcha_verify_invalid_number(self) -> None:
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

    def test_altcha_verify_expired_challenge(self) -> None:
        secret_key = "test-secret-key-expired"
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

    def test_altcha_verify_tampered_signature(self) -> None:
        secret_key = "test-secret-key-tamper"
        challenge = AltchaService.create_challenge(secret_key, max_number=2000, expires_in_seconds=300)

        solved_number = _solve_challenge(challenge)
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

    def test_altcha_verify_tampered_salt(self) -> None:
        secret_key = "test-secret-key-tamper-salt"
        challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=300)
        solved_number = _solve_challenge(challenge)

        payload = {
            "algorithm": challenge["algorithm"],
            "challenge": challenge["challenge"],
            "number": solved_number,
            "salt": challenge["salt"] + "_tampered",
            "signature": challenge["signature"],
            "expires": challenge["expires"],
            "maxnumber": challenge["maxnumber"],
        }

        is_valid, err = AltchaService.verify_solution(payload, secret_key)
        assert is_valid is False
        assert "signature" in err.lower() or "invalid" in err.lower()

    def test_altcha_verify_wrong_secret_key(self) -> None:
        secret_key = "correct-secret-key"
        wrong_key = "wrong-secret-key"
        challenge = AltchaService.create_challenge(secret_key, max_number=1000, expires_in_seconds=300)
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

        is_valid, err = AltchaService.verify_solution(payload, wrong_key)
        assert is_valid is False
        assert "signature" in err.lower() or "invalid" in err.lower()

    @pytest.mark.parametrize(
        "missing_field",
        ["algorithm", "challenge", "number", "salt", "signature", "expires"],
    )
    def test_altcha_verify_missing_individual_required_fields(self, missing_field: str) -> None:
        secret_key = "test-secret-key"
        payload = {
            "algorithm": "SHA-256",
            "challenge": "a" * 64,
            "number": 100,
            "salt": "somesaltvalue123",
            "signature": "b" * 64,
            "expires": int(time.time()) + 300,
            "maxnumber": 1000,
        }
        del payload[missing_field]

        is_valid, err = AltchaService.verify_solution(payload, secret_key)
        assert is_valid is False
        assert "missing required field" in err.lower()

    @pytest.mark.parametrize(
        "invalid_payload",
        [None, [], "raw string", 12345, {}],
    )
    def test_altcha_verify_non_dict_or_empty_payload(self, invalid_payload: Any) -> None:
        secret_key = "test-secret-key"
        is_valid, err = AltchaService.verify_solution(invalid_payload, secret_key)
        assert is_valid is False
        assert len(err) > 0

    @pytest.mark.parametrize("bad_algo", ["MD5", "SHA-1", "SHA-512", "sha-256", "BLAKE2b", ""])
    def test_altcha_verify_unsupported_algorithms(self, bad_algo: str) -> None:
        secret_key = "test-secret-key"
        payload = {
            "algorithm": bad_algo,
            "challenge": "abc",
            "number": 123,
            "salt": "salt",
            "signature": "sig",
            "expires": int(time.time()) + 100,
            "maxnumber": 1000,
        }
        is_valid, err = AltchaService.verify_solution(payload, secret_key)
        assert is_valid is False
        assert "algorithm" in err.lower()


@pytest.mark.unit
class TestAltchaChallengeEndpoint:
    """Tests for the Flask HTTP route /api/v1/auth/altcha-challenge."""

    def test_altcha_challenge_route_success(self, client: Any, app: Any) -> None:
        response = client.get("/api/v1/auth/altcha-challenge")
        assert response.status_code == 200
        assert response.headers["Content-Type"] == "application/json"

        data = response.get_json()
        assert data["algorithm"] == "SHA-256"
        assert "challenge" in data
        assert "salt" in data
        assert "maxnumber" in data
        assert "signature" in data
        assert "expires" in data

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

    @pytest.mark.parametrize("disallowed_method", ["post", "put", "delete", "patch"])
    def test_altcha_challenge_route_disallowed_methods(self, client: Any, disallowed_method: str) -> None:
        method_caller = getattr(client, disallowed_method)
        response = method_caller("/api/v1/auth/altcha-challenge")
        assert response.status_code == 405
