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
    "bug_report_not_found": {
        "en": "Bug report not found.",
        "pl": "Nie znaleziono zgłoszenia błędu.",
        "de": "Fehlerbericht nicht gefunden.",
        "es": "Informe de error no encontrado.",
        "ja": "バグ報告が見つかりません。",
    },
    "bug_report_seen_failed": {
        "en": "Failed to mark the bug report as seen.",
        "pl": "Nie udało się oznaczyć zgłoszenia jako przeczytanego.",
        "de": "Der Fehlerbericht konnte nicht als gelesen markiert werden.",
        "es": "No se pudo marcar el informe de error como visto.",
        "ja": "バグ報告を既読にできませんでした。",
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
    "password_required": {
        "en": "Enter your password.",
        "pl": "Podaj hasło.",
        "de": "Gib dein Passwort ein.",
        "es": "Introduce tu contraseña.",
        "ja": "パスワードを入力してください。",
    },
    "incorrect_password": {
        "en": "Incorrect password.",
        "pl": "Nieprawidłowe hasło.",
        "de": "Falsches Passwort.",
        "es": "Contraseña incorrecta.",
        "ja": "パスワードが正しくありません。",
    },
    "two_factor_unavailable": {
        "en": "Two-factor authentication is not available right now.",
        "pl": "Uwierzytelnianie dwuskładnikowe jest chwilowo niedostępne.",
        "de": "Die Zwei-Faktor-Authentifizierung ist derzeit nicht verfügbar.",
        "es": "La autenticación en dos pasos no está disponible en este momento.",
        "ja": "現在、二要素認証は利用できません。",
    },
    "two_factor_already_enabled": {
        "en": "Two-factor authentication is already on.",
        "pl": "Uwierzytelnianie dwuskładnikowe jest już włączone.",
        "de": "Die Zwei-Faktor-Authentifizierung ist bereits aktiviert.",
        "es": "La autenticación en dos pasos ya está activada.",
        "ja": "二要素認証はすでに有効です。",
    },
    "two_factor_not_enabled": {
        "en": "Two-factor authentication is not turned on.",
        "pl": "Uwierzytelnianie dwuskładnikowe nie jest włączone.",
        "de": "Die Zwei-Faktor-Authentifizierung ist nicht aktiviert.",
        "es": "La autenticación en dos pasos no está activada.",
        "ja": "二要素認証は有効になっていません。",
    },
    "two_factor_not_started": {
        "en": "Start the setup first to get a secret to scan.",
        "pl": "Najpierw rozpocznij konfigurację, aby otrzymać klucz do zeskanowania.",
        "de": "Starte zuerst die Einrichtung, um ein Geheimnis zum Scannen zu erhalten.",
        "es": "Inicia primero la configuración para obtener un secreto que escanear.",
        "ja": "まず設定を開始して、スキャンするシークレットを取得してください。",
    },
    "two_factor_required": {
        "en": "Enter the code from your authenticator app.",
        "pl": "Podaj kod z aplikacji uwierzytelniającej.",
        "de": "Gib den Code aus deiner Authentifizierungs-App ein.",
        "es": "Introduce el código de tu aplicación de autenticación.",
        "ja": "認証アプリのコードを入力してください。",
    },
    "invalid_two_factor_code": {
        "en": "That code is not valid. Check the code and try again.",
        "pl": "Ten kod jest nieprawidłowy. Sprawdź kod i spróbuj ponownie.",
        "de": "Dieser Code ist ungültig. Prüfe den Code und versuche es erneut.",
        "es": "Ese código no es válido. Revísalo e inténtalo de nuevo.",
        "ja": "このコードは無効です。確認してもう一度お試しください。",
    },
    "two_factor_locked": {
        "en": "Too many wrong codes. Try again in a few minutes.",
        "pl": "Zbyt wiele błędnych kodów. Spróbuj ponownie za kilka minut.",
        "de": "Zu viele falsche Codes. Versuche es in ein paar Minuten erneut.",
        "es": "Demasiados códigos incorrectos. Inténtalo de nuevo en unos minutos.",
        "ja": "コードの誤りが多すぎます。数分後にもう一度お試しください。",
    },
    "two_factor_challenge_invalid": {
        "en": "This sign-in step expired. Sign in again.",
        "pl": "Ten krok logowania wygasł. Zaloguj się ponownie.",
        "de": "Dieser Anmeldeschritt ist abgelaufen. Melde dich erneut an.",
        "es": "Este paso de inicio de sesión caducó. Inicia sesión de nuevo.",
        "ja": "このログイン手順は期限切れです。もう一度ログインしてください。",
    },
    "registration_closed": {
        "en": "Creating new accounts is paused right now. Please try again later.",
        "pl": "Zakładanie nowych kont jest obecnie wstrzymane. Spróbuj ponownie później.",
        "de": "Neue Konten können gerade nicht erstellt werden. Bitte versuche es später erneut.",
        "es": "La creación de cuentas nuevas está en pausa. Inténtalo de nuevo más tarde.",
        "ja": "現在、新しいアカウントの作成を停止しています。しばらくしてからもう一度お試しください。",
    },
    "guest_bug_reports_closed": {
        "en": "Sign in to send a bug report.",
        "pl": "Zaloguj się, aby wysłać zgłoszenie błędu.",
        "de": "Melde dich an, um einen Fehlerbericht zu senden.",
        "es": "Inicia sesión para enviar un informe de error.",
        "ja": "バグ報告を送信するにはログインしてください。",
    },
    "bug_report_image_required": {
        "en": "Attach at least one screenshot.",
        "pl": "Dołącz co najmniej jeden zrzut ekranu.",
        "de": "Hänge mindestens einen Screenshot an.",
        "es": "Adjunta al menos una captura de pantalla.",
        "ja": "スクリーンショットを1枚以上添付してください。",
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


def coded_error_response(err: Any, lang: str | None = None) -> Response:
    """`error_response` for any exception carrying `code`, `status` and `extra` (TwoFactorError).

    A lockout also sets the standard Retry-After header.
    """
    response, status = error_response(err.code, err.status, lang, **err.extra)
    if "retry_after" in err.extra:
        response.headers["Retry-After"] = str(err.extra["retry_after"])
    return response, status
