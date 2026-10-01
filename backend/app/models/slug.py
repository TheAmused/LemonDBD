# backend/app/models/slug.py
"""Canonical slug generation shared by every static-content entity.

Slugs are the stable, human-readable identity of a row. Display names change
(a chapter gets a trademark symbol, a realm is renamed, a wiki page is edited)
and every string-keyed reference elsewhere in the database silently breaks when
they do. Slugs are derived once at seed time and then frozen, so a rename is a
one-column UPDATE instead of a cross-table search-and-replace.

`slugify` is deliberately aggressive: it strips legal symbols (R, TM, C), the
parenthetical "(Chapter)" suffix the wiki appends inconsistently, the trailing
or leading word "Chapter", and the leading article "The". Those four variations
are the entire reason `characters.chapter_name` failed to join against
`chapters.name` for 10 of the 69 chapter rows -- "SAW(TM) Chapter",
"The SAW(TM) Chapter" and "SAW (Chapter)" are one chapter, and all three
slugify to `saw`.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable, Container

_LEGAL_SYMBOLS = re.compile(r"[®™©]")
# Apostrophes are deleted, not replaced, so "Lery's Memorial Institute" slugs
# to `lerys_memorial_institute` -- matching the slugs already present in the
# map export -- instead of splitting into `lery_s_memorial_institute`.
_APOSTROPHES = re.compile("['‘’ʼ`]")
_LEADING_ARTICLE = re.compile(r"^the\s+", re.IGNORECASE)
_NON_SLUG = re.compile(r"[^a-z0-9]+")
_WORD_BREAK = re.compile(r"[\s\-/_]+")
_PUNCT = re.compile(r"[^a-z0-9]")


def slugify(
    value: str | None,
    *,
    strip_article: bool = False,
    sep: str = "_",
    max_len: int | None = None,
    fallback: str = "",
    fold_unicode: bool = True,
    strip_symbols: bool = True,
    drop_punct: bool = False,
) -> str:
    """Lowercase slug: `"The SAW(TM) Chapter"` -> `"saw"`.

    This is the one slug implementation; every other caller picks its variant
    through parameters instead of keeping a private copy.

    `strip_article` drops a leading "The". Leave it off for characters -- "The
    Trapper" and "The Shape" are canonical names there, and stripping the
    article would also collapse a hypothetical survivor named "Trapper" onto
    the killer.

    `sep` joins the words (`_` for static content, `-` for user-facing URLs).
    `max_len` truncates and re-strips so a cut mid-word never leaves a dangling
    separator; `fallback` is returned when nothing slug-safe remains.
    `fold_unicode` NFKD-folds to ASCII ("Cafe" for "Café"); without it every
    non-ASCII character becomes a separator. `strip_symbols` deletes legal
    symbols and apostrophes outright. `drop_punct` deletes punctuation instead
    of treating it as a separator -- only whitespace, `-`, `/` and `_` separate
    words, so "a.b c" is `ab_c`, not `a_b_c`.
    """
    if not value:
        return fallback

    text = str(value)
    if fold_unicode:
        text = unicodedata.normalize("NFKD", text)
    if strip_symbols:
        text = _LEGAL_SYMBOLS.sub("", text)
        text = _APOSTROPHES.sub("", text)
    if fold_unicode:
        text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()

    if strip_article:
        text = _LEADING_ARTICLE.sub("", text)

    if drop_punct:
        words = (_PUNCT.sub("", w) for w in _WORD_BREAK.split(text))
        slug = sep.join(w for w in words if w)
    else:
        slug = _NON_SLUG.sub(sep, text).strip(sep)

    if max_len is not None:
        slug = slug[:max_len].strip(sep)
    return slug or fallback


def unique_slug(
    base: str,
    exists: Callable[[str], object],
    *,
    reserved: Container[str] = (),
    sep: str = "-",
) -> str:
    """The first `base`, `base-2`, `base-3`... that is neither reserved nor
    already taken (`exists(candidate)` truthy). Slugs are a row's stable public
    identity, so a collision must never silently overwrite one."""
    candidate = base
    n = 2
    while candidate in reserved or exists(candidate):
        candidate = f"{base}{sep}{n}"
        n += 1
    return candidate
