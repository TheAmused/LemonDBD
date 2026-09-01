# backend/app/utils/api_i18n.py
"""Small, explicit catalog for localizing JSON API error/success messages.

This does not attempt to cover every route in the backend -- it exists so
that endpoints backing the /user page (bug reports, profile, avatar) return
messages in the caller's language instead of hardcoded English. New routes
can register additional keys here as they're localized.
"""
from __future__ import annotations

from typing import Any

from flask import jsonify

from app.utils.lang import extract_lang

Response = tuple[Any, int]

_MESSAGES: dict[str, dict[str, str]] = {
    "auth_required": {
        "en": "Authentication required.",
        "pl": "Wymagane uwierzytelnienie.",
        "de": "Authentifizierung erforderlich.",
        "es": "Se requiere autenticación.",
        "ja": "認証が必要です。",
    },
    "bug_reports_fetch_failed": {
        "en": "Failed to fetch bug reports.",
        "pl": "Nie udało się pobrać zgłoszeń błędów.",
        "de": "Fehler beim Abrufen der Fehlerberichte.",
        "es": "No se pudieron obtener los informes de errores.",
        "ja": "バグ報告の取得に失敗しました。",
    },
    "invalid_pagination": {
        "en": "Invalid page or per_page parameter.",
        "pl": "Nieprawidłowy parametr page lub per_page.",
        "de": "Ungültiger Parameter page oder per_page.",
        "es": "Parámetro page o per_page no válido.",
        "ja": "page または per_page パラメータが無効です。",
    },
    "no_avatar_file": {
        "en": "No avatar file provided ('avatar' or 'file').",
        "pl": "Nie przesłano pliku awatara („avatar” lub „file”).",
        "de": "Keine Avatar-Datei angegeben ('avatar' oder 'file').",
        "es": "No se proporcionó ningún archivo de avatar ('avatar' o 'file').",
        "ja": "アバターファイルが指定されていません（'avatar' または 'file'）。",
    },
}


def localized_message(key: str, lang: str | None = None) -> str:
    """Look up a catalog message for `key`, falling back to English."""
    entry = _MESSAGES.get(key)
    if not entry:
        return key
    resolved_lang = (lang or extract_lang() or "en").lower()
    return entry.get(resolved_lang, entry["en"])


def error_response(key: str, status: int, lang: str | None = None, **extra: Any) -> Response:
    """Build a `(jsonify(...), status)` pair with a localized `error` message."""
    payload = {"error": localized_message(key, lang), "error_code": key, "status": status}
    payload.update(extra)
    return jsonify(payload), status
