# backend/tests/unit/test_slug_helpers.py
"""Characterization tests for the shared slug helpers.

The `_legacy_*` functions below are verbatim copies of the per-service slug
implementations that were merged into `app.models.slug`. Every output of the
old copies must be reproduced by the matching parameter set of the shared
`slugify` / `unique_slug`.
"""

from __future__ import annotations

import re
import unicodedata

import pytest

from app.models.slug import slugify, unique_slug

_BATTERY = [
    None,
    "",
    "   ",
    "Hooked on You",
    "Best Chase Music!",
    "The SAW(TM) Chapter",
    "SAW™ Chapter",
    "Lery's Memorial Institute",
    "Dr. Who / A-B_C",
    "a.b c",
    "  --weird__  input--  ",
    "Café Éclair",
    "Zażółć gęślą jaźń",
    "日本語のタイトル",
    "Über Straße",
    "!!!",
    "The Trapper",
    "x" * 300,
    "word " * 60,
    "a" * 79 + " b",
    "a" * 63 + "-" + "b" * 10,
    "Tab\tand\nnewline",
    "①② fullwidthＡＢ",
    "İstanbul",
]


def _legacy_perks(text):
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    clean = normalized.lower().strip()
    clean = re.sub(r"[\s\-/]+", "_", clean)
    clean = re.sub(r"[^a-z0-9_]", "", clean)
    clean = re.sub(r"_+", "_", clean)
    return clean.strip("_")


_INVALID = re.compile(r"[^a-z0-9]+")


def _legacy_hyphen(text, max_len, fallback):
    slug = _INVALID.sub("-", (text or "").strip().lower()).strip("-")
    slug = slug[:max_len].strip("-")
    return slug or fallback


_LEGAL = re.compile(r"[®™©]")
_APOS = re.compile("['‘’ʼ`]")
_ART = re.compile(r"^the\s+", re.IGNORECASE)


def _legacy_models(value, strip_article=False):
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = _LEGAL.sub("", text)
    text = _APOS.sub("", text)
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    if strip_article:
        text = _ART.sub("", text)
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


@pytest.mark.parametrize("text", _BATTERY)
def test_matches_legacy_models(text):
    assert slugify(text) == _legacy_models(text)
    assert slugify(text, strip_article=True) == _legacy_models(text, True)


@pytest.mark.parametrize("text", [t for t in _BATTERY if t is None or isinstance(t, str)])
def test_matches_legacy_perks(text):
    got = slugify(text, strip_symbols=False, drop_punct=True)
    assert got == _legacy_perks(text)


@pytest.mark.parametrize("text", _BATTERY)
@pytest.mark.parametrize("max_len,fallback", [(80, "tier-list"), (64, "roster"), (100, "entity-3")])
def test_matches_legacy_hyphen_variants(text, max_len, fallback):
    got = slugify(text, sep="-", fold_unicode=False, strip_symbols=False, max_len=max_len, fallback=fallback)
    assert got == _legacy_hyphen(text, max_len, fallback)


def test_fallback_and_truncation_restrip():
    assert slugify("", fallback="x") == "x"
    assert slugify("!!!", fallback="x") == "x"
    assert slugify("ab-cd", sep="-", max_len=3) == "ab"


def test_unique_slug_suffixes_and_reserved():
    taken = {"a", "a-2"}
    assert unique_slug("a", taken.__contains__) == "a-3"
    assert unique_slug("b", taken.__contains__) == "b"
    assert unique_slug("admin", lambda c: False, reserved={"admin"}) == "admin-2"
    assert unique_slug("a", {"a"}.__contains__, sep="_") == "a_2"
