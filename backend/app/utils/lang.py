# backend/app/utils/lang.py
import re

from flask import request

#: THE list of site languages (onboarding / settings). Content text for these
#: locales lives in the seed JSON files (`translations` key of each row) and
#: the frontend ships matching `src/locales/<code>` bundles. Every other locale
#: constant below is derived from this one -- add a language here only.
SUPPORTED_LOCALES: tuple[str, ...] = ("en", "pl", "de", "es", "ja")

#: Locale-code lookup set (same members as `SUPPORTED_LOCALES`).
SUPPORTED_LANGS: frozenset[str] = frozenset(SUPPORTED_LOCALES)

#: The language stored in the base columns; it never appears in a
#: `translations` blob, where an "en" entry could only restate a column.
SOURCE_LOCALE = "en"

#: The locales a `translations` blob may carry (alphabetical, as always).
TRANSLATABLE_LOCALES: tuple[str, ...] = tuple(sorted(loc for loc in SUPPORTED_LOCALES if loc != SOURCE_LOCALE))

_REFERER_LANG_RE = re.compile(r"/(" + "|".join(SUPPORTED_LOCALES) + r")(?:/|$|\?)", re.IGNORECASE)


def extract_lang() -> str | None:
    """Extract requested language from query parameter, Referer path, or Accept-Language header."""
    lang = request.args.get("lang")
    if lang:
        return lang.strip().lower()

    referer = request.headers.get("Referer", "")
    if referer:
        m = _REFERER_LANG_RE.search(referer)
        if m:
            return m.group(1).lower()

    accept_lang = request.headers.get("Accept-Language", "")
    if accept_lang:
        primary = accept_lang.split(",")[0].split(";")[0].split("-")[0].strip().lower()
        if primary in SUPPORTED_LANGS:
            return primary

    return None
