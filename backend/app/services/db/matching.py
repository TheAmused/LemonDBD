# backend/app/services/db/matching.py
"""Name-normalizing helpers for the two places that still have to match text.

Neither of those places is the import path. The seed files carry explicit
integer ids and integer foreign keys, and `import_database()` resolves rows by
primary key alone; nothing there ever compares a name.

These functions exist for the two one-time conversions that had no ids to work
with in the first place:

* `backend/scripts/normalize_static_export.py`, which reads the old
  string-referenced export and decides which id each row gets, and
* the `normalize_content_001` migration, which does the same in-place against a
  live database. It carries its own private copy so that it keeps working when
  this module changes.

`chapter_key` exists because the chapters page and the characters page on the
wiki spell the same chapter three different ways -- "SAW(TM) Chapter", "The
SAW(TM) Chapter", "SAW (Chapter)" -- which is why 10 of 98 characters could not
be matched to a chapter before this conversion ran.
"""

from __future__ import annotations

import re
import unicodedata

_LEGAL_SYMBOLS = re.compile(r"[®™©]")
_APOSTROPHES = re.compile("['‘’ʼ`]")
_PARENTHETICAL_CHAPTER = re.compile(r"\s*\(\s*chapter\s*\)\s*", re.IGNORECASE)
_BARE_CHAPTER_WORD = re.compile(r"(^|\s)chapter(\s|$)", re.IGNORECASE)
_LEADING_ARTICLE = re.compile(r"^the\s+", re.IGNORECASE)
_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def _ascii(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = _APOSTROPHES.sub("", _LEGAL_SYMBOLS.sub("", text))
    return text.encode("ascii", "ignore").decode("ascii")


def name_key(value: str | None) -> str:
    """`"Lery's Memorial Institute"` -> `lerys_memorial_institute`.

    Apostrophes are deleted rather than replaced, so the key does not split on
    them.
    """
    if not value:
        return ""
    return _NON_ALNUM.sub("_", _ascii(value).lower()).strip("_")


def chapter_key(name: str | None) -> str:
    """Collapse every spelling of a chapter title onto one key.

    "SAW(TM) Chapter", "The SAW(TM) Chapter" and "SAW (Chapter)" all become
    `saw`; "The Last Breath Chapter" and "Last Breath Chapter" both become
    `last_breath`.
    """
    if not name:
        return ""
    text = _ascii(name)
    text = _PARENTHETICAL_CHAPTER.sub(" ", text)
    text = _BARE_CHAPTER_WORD.sub(" ", text)
    text = _LEADING_ARTICLE.sub("", text.strip())
    return _NON_ALNUM.sub("_", text.lower()).strip("_")
