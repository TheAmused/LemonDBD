# backend/app/core/cache_params.py
"""Normalizers for the query parameters that key a `@cache_catalog` entry.

A cache key built from raw query strings lets anyone mint a new full-size entry
per request: `?sort_by=junk1`, `?sort_by=junk2` and so on all produce the same
body the view computed for `sort_by=name`, and each is stored separately. A
normalizer maps every raw value the view would treat the same way onto one
string, so those requests share an entry. The rule that keeps this safe is that
a normalizer must agree with its view: if the view clamps `limit` to 1..500, the
normalizer clamps it to the same range, or two different responses would share
a key.

A value that cannot be normalized into a small set (an unknown category, a long
free-text search) raises `Uncacheable`, and the request is served live without
touching the cache, which costs one query and leaves nothing behind to flood.
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
    """Trimmed, lower-cased text, for parameters the view compares case-insensitively.

    `drop_all` folds the literal "all" into "absent", for filters where "all"
    means no filter.
    """

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

    With `strict=True` an unrecognised value is `Uncacheable` instead of being
    folded into `default`, for filters where the view answers an unknown value
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
    """An integer clamped into `[lo, hi]`, with `default` for a missing or non-numeric value.

    `clamp_high=False` makes a value above `hi` `Uncacheable` instead, for a
    parameter the view echoes back (a page number), where clamping would store
    the wrong echo. `absent_is_none` leaves a parameter that was not sent out of
    the key, for views whose response shape depends on whether it was present.
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
