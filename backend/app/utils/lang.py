# backend/app/utils/lang.py
import re

from flask import request

SUPPORTED_LANGS = {"pl", "de", "es", "fr", "it", "ja", "en"}


def extract_lang() -> str | None:
    """Extract requested language from query parameter, Referer path, or Accept-Language header."""
    lang = request.args.get("lang")
    if lang:
        return lang.strip().lower()

    referer = request.headers.get("Referer", "")
    if referer:
        m = re.search(r"/(pl|de|es|fr|it|ja|en)(?:/|$|\?)", referer, re.IGNORECASE)
        if m:
            return m.group(1).lower()

    accept_lang = request.headers.get("Accept-Language", "")
    if accept_lang:
        primary = accept_lang.split(",")[0].split(";")[0].split("-")[0].strip().lower()
        if primary in SUPPORTED_LANGS:
            return primary

    return None
