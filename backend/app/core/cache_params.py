# backend/app/core/cache_params.py
"""Normalizers for the query parameters that key a `@cache_catalog` entry.

Keying on raw query strings lets `?sort_by=junk1`, `?sort_by=junk2`... each mint
a full-size entry for the same body. A normalizer maps every value the view
treats alike onto one string, and must agree with its view (same clamp, same
default) or two different responses would share a key. A value that cannot be
reduced to a small set raises `Uncacheable` and the request is served live.
"""
from __future__ import annotations

from typing import Callable, Collection

#: Takes the raw query value (None when absent) and returns the key fragment,
#: or None when the parameter should not appear in the key at all.
Normalizer = Callable[[str | None], str | None]

#: Free-text values longer than this are not cached.
MAX_TEXT_LENGTH = 64

_TRUE_VALUES = frozenset({"true", "1", "yes"})


class Uncacheable(Exception):
    """The request carries a value that must not mint a cache entry."""


def norm_lower(*, drop_all: bool = False, max_len: int = MAX_TEXT_LENGTH) -> Normalizer:
    """Trimmed, lower-cased text; `drop_all` folds "all" into absent."""

    def normalize(raw: str | None) -> str | None:
        value = (raw or "").strip().lower()
        if len(value) > max_len:
            raise Uncacheable(f"value longer than {max_len} characters")
        if not value or (drop_all and value == "all"):
            return None
        return value

    return normalize


def norm_choice(allowed: Collection[str], *, default: str | None = None, strict: bool = False) -> Normalizer:
    """One of `allowed` (lower-cased), otherwise `default`.

    `strict` makes an unknown value `Uncacheable`, for filters where it answers
    differently from an absent one (an unknown category selects nothing).
    """
    wanted = frozenset(allowed)

    def normalize(raw: str | None) -> str | None:
        value = (raw or "").strip().lower()
        if value in wanted:
            return value
        if strict and value and value != "all":
            raise Uncacheable(f"unexpected value {value[:16]!r}")
        return default

    return normalize


def norm_int(
    default: int, lo: int, hi: int, *, clamp_high: bool = True, absent_is_none: bool = False
) -> Normalizer:
    """An integer clamped into `[lo, hi]`, `default` when missing or non-numeric.

    `clamp_high=False` makes a value above `hi` `Uncacheable` (for a page number
    the view echoes back). `absent_is_none` omits an unsent parameter from the
    key, for views whose response shape depends on its presence.
    """

    def normalize(raw: str | None) -> str | None:
        if absent_is_none and not raw:
            return None
        try:
            value = int(raw) if raw is not None else default
        except ValueError:
            value = default
        if value > hi and not clamp_high:
            raise Uncacheable(f"value above {hi}")
        return str(max(lo, min(value, hi)))

    return normalize


def norm_bool() -> Normalizer:
    """"1" for the spellings the view accepts as true, otherwise absent."""

    def normalize(raw: str | None) -> str | None:
        return "1" if (raw or "").strip().lower() in _TRUE_VALUES else None

    return normalize
