# backend/tests/unit/test_email_address.py
"""canonical_email: one spelling per mailbox, and no merging of mailboxes that are really different."""
import pytest
from flask import Flask

from app.services.user.auth import create_user_account
from app.utils.email_address import canonical_email


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("abc@gmail.com", "abc@gmail.com"),
        ("ABC@Gmail.COM", "abc@gmail.com"),
        ("a.b.c@gmail.com", "abc@gmail.com"),
        ("abc+wp@gmail.com", "abc@gmail.com"),
        ("a.b.c+wp+more@gmail.com", "abc@gmail.com"),
        ("abc@googlemail.com", "abc@gmail.com"),
        ("  abc@gmail.com  ", "abc@gmail.com"),
        ("abc@gmail.com.", "abc@gmail.com"),
        ("abc@\uff27mail.com", "abc@gmail.com"),  # full-width G folds under NFKC
        ("name+shop@outlook.com", "name@outlook.com"),
        ("name+shop@proton.me", "name@proton.me"),
        ("name+x@iCloud.com", "name@icloud.com"),
        # unknown providers: lower-case only, dots and + are significant there
        ("first.last@example.com", "first.last@example.com"),
        ("first+tag@example.com", "first+tag@example.com"),
        ("User@Example.COM", "user@example.com"),
        ("a.b@yahoo.com", "a.b@yahoo.com"),
        ("a.b@gmail.com.pl", "a.b@gmail.com.pl"),  # a different domain that merely looks like Gmail
    ],
)
def test_canonical_spelling(raw: str, expected: str) -> None:
    assert canonical_email(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [None, "", "   ", "no-at-sign", "@gmail.com", "abc@", "a b@gmail.com", "+@gmail.com", "...@gmail.com", "a" * 300 + "@x.io", 5],
)
def test_implausible_input_has_no_canonical_form(raw: object) -> None:
    assert canonical_email(raw) is None  # type: ignore[arg-type]


def test_different_gmail_mailboxes_stay_different() -> None:
    assert canonical_email("abc@gmail.com") != canonical_email("abd@gmail.com")
    assert canonical_email("ab.c@gmail.com") == canonical_email("abc+x@googlemail.com")


def test_canonicalisation_is_idempotent() -> None:
    for raw in ("A.B+c@googlemail.com", "x+y@outlook.com", "Q@Example.com"):
        once = canonical_email(raw)
        assert canonical_email(once) == once


def test_registration_treats_underscore_and_percent_in_an_address_literally(app: Flask) -> None:
    """The duplicate-address check used LIKE, where `_` and `%` are wildcards: `a_c@` matched `abc@`."""
    first, error = create_user_account("abc_login", "abcname", "abc@example.com", "Passw0rd!x")
    assert error is None and first is not None

    lookalike, error = create_user_account("a_c_login", "a_cname", "a_c@example.com", "Passw0rd!x")
    assert error is None and lookalike is not None

    duplicate, error = create_user_account("other_login", "othername", "ABC@Example.com", "Passw0rd!x")
    assert duplicate is None and error is not None
