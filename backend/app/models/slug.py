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

_LEGAL_SYMBOLS = re.compile(r"[®™©]")
# Apostrophes are deleted, not replaced, so "Lery's Memorial Institute" slugs
# to `lerys_memorial_institute` -- matching the slugs already present in the
# map export -- instead of splitting into `lery_s_memorial_institute`.
_APOSTROPHES = re.compile("['‘’ʼ`]")
_PARENTHETICAL_CHAPTER = re.compile(r"\s*\(\s*chapter\s*\)\s*", re.IGNORECASE)
_BARE_CHAPTER_WORD = re.compile(r"(^|\s)chapter(\s|$)", re.IGNORECASE)
_LEADING_ARTICLE = re.compile(r"^the\s+", re.IGNORECASE)
_NON_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(value: str | None, *, strip_article: bool = False) -> str:
    """Lowercase ASCII slug: `"The SAW(TM) Chapter"` -> `"saw"`.

    `strip_article` drops a leading "The". Leave it off for characters -- "The
    Trapper" and "The Shape" are canonical names there, and stripping the
    article would also collapse a hypothetical survivor named "Trapper" onto
    the killer.
    """
    if not value:
        return ""

    text = unicodedata.normalize("NFKD", str(value))
    text = _LEGAL_SYMBOLS.sub("", text)
    text = _APOSTROPHES.sub("", text)
    text = text.encode("ascii", "ignore").decode("ascii").lower()

    if strip_article:
        text = _LEADING_ARTICLE.sub("", text)

    return _NON_SLUG.sub("_", text).strip("_")


def chapter_slug(name: str | None) -> str:
    """Slug for a chapter, collapsing every "Chapter" spelling the wiki uses.

    "SAW(TM) Chapter", "The SAW(TM) Chapter" and "SAW (Chapter)" all become
    `saw`; "The Last Breath Chapter" and "Last Breath Chapter" both become
    `last_breath`.
    """
    if not name:
        return ""

    text = unicodedata.normalize("NFKD", str(name))
    text = _LEGAL_SYMBOLS.sub("", text)
    text = _APOSTROPHES.sub("", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = _PARENTHETICAL_CHAPTER.sub(" ", text)
    text = _BARE_CHAPTER_WORD.sub(" ", text)
    text = _LEADING_ARTICLE.sub("", text.strip())

    return _NON_SLUG.sub("_", text.lower()).strip("_")


def unique_slug(base: str, taken: set[str], *, fallback: str = "item") -> str:
    """Append `_2`, `_3`, ... until `base` is free, then reserve it in `taken`."""
    candidate = base or fallback
    if candidate not in taken:
        taken.add(candidate)
        return candidate

    suffix = 2
    while f"{candidate}_{suffix}" in taken:
        suffix += 1
    result = f"{candidate}_{suffix}"
    taken.add(result)
    return result
