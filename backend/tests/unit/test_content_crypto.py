import pytest
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)


def test_canonicalize_and_hash_is_order_independent():
    dict1 = {"title": "My List", "items": [1, 2, 3], "desc": "Hello"}
    dict2 = {"desc": "Hello", "items": [1, 2, 3], "title": "My List"}

    canon1 = canonicalize_payload(dict1)
    canon2 = canonicalize_payload(dict2)
    assert canon1 == canon2

    hash1 = compute_content_hash(canon1)
    hash2 = compute_content_hash(canon2)
    assert hash1 == hash2
    assert len(hash1) == 64


def test_canonicalize_nested_dicts_and_unicode():
    dict1 = {"b": {"y": 2, "x": 1}, "a": "Café", "z": "日本語"}
    dict2 = {"z": "日本語", "a": "Café", "b": {"x": 1, "y": 2}}

    canon1 = canonicalize_payload(dict1)
    canon2 = canonicalize_payload(dict2)
    assert canon1 == canon2
    # Ensure compact separators (no whitespace around commas and colons) and non-escaped unicode
    assert canon1 == '{"a":"Café","b":{"x":1,"y":2},"z":"日本語"}'


def test_canonicalize_invalid_type_raises():
    with pytest.raises(TypeError):
        canonicalize_payload("not a dict")  # type: ignore[arg-type]

    with pytest.raises(TypeError):
        canonicalize_payload([1, 2, 3])  # type: ignore[arg-type]


def test_compute_content_hash_invalid_type_raises():
    with pytest.raises(TypeError):
        compute_content_hash(12345)  # type: ignore[arg-type]


def test_sign_and_verify_signature():
    secret = "test-secret-key-very-secure-1234567890"
    user_id = 42
    content_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    sig = sign_content(user_id, content_hash, secret)
    assert sig is not None
    assert len(sig) == 64

    # Valid verification
    assert verify_content_signature(user_id, content_hash, sig, secret) is True

    # Case-insensitive verification
    assert verify_content_signature(user_id, content_hash, sig.upper(), secret) is True

    # Fails if tampered hash
    assert verify_content_signature(user_id, "different_hash" + "0" * 50, sig, secret) is False

    # Fails if tampered author
    assert verify_content_signature(999, content_hash, sig, secret) is False

    # Fails if tampered signature
    assert verify_content_signature(user_id, content_hash, "f" * 64, secret) is False


def test_sign_content_validation_raises():
    secret = "test-secret-key"
    content_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    with pytest.raises(ValueError, match="user_id must be a positive integer"):
        sign_content(0, content_hash, secret)

    with pytest.raises(ValueError, match="user_id must be a positive integer"):
        sign_content(-1, content_hash, secret)

    with pytest.raises(ValueError, match="user_id must be a positive integer"):
        sign_content(True, content_hash, secret)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="content_hash is required"):
        sign_content(1, "", secret)

    with pytest.raises(ValueError, match="secret_key is required"):
        sign_content(1, content_hash, "")


def test_verify_empty_or_malformed_signature_returns_false():
    secret = "test-secret-key"
    assert verify_content_signature(1, "hash", "", secret) is False
    assert verify_content_signature(0, "hash", "sig", secret) is False
    assert verify_content_signature(-5, "hash", "sig", secret) is False
    assert verify_content_signature(1, "", "sig", secret) is False
    assert verify_content_signature(1, "hash", "sig", "") is False
    assert verify_content_signature(None, "hash", "sig", secret) is False
    assert verify_content_signature(1, None, "sig", secret) is False
    assert verify_content_signature(1, "hash", None, secret) is False
    assert verify_content_signature(1, "hash", "sig", None) is False
