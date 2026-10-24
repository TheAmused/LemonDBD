# backend/app/utils/site_urls.py
from flask import current_app

from app.utils.lang import SOURCE_LOCALE, SUPPORTED_LANGS


def site_page_url(language: str | None, page: str, anchor: str = "") -> str:
    """A page of the frontend in `language` ("rules#fairPlay"), or "" when FRONTEND_URL is not configured."""
    base = str(current_app.config.get("FRONTEND_URL") or "").rstrip("/")
    if not base:
        return ""
    return f"{base}/{language if language in SUPPORTED_LANGS else SOURCE_LOCALE}/{page}" + (f"#{anchor}" if anchor else "")
