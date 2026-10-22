# backend/app/services/challenge_reset_email.py
"""The email a player gets when an admin resets their progress in a challenge.

It is built from the same blocks as the moderation emails and reuses their wording (greeting, the
Fair play rule, human review, the way to contest it, footer), so it reads and looks like them. Only
what is specific to a reset lives here. The admin's optional note is shown as written, in a block that
says so; who reported or any internal notes are never included.
"""
import logging

from flask import current_app

from app.core.rule_sections import RULE_SECTION_NUMBERS
from app.models import User
from app.services.mail_service import send_sanction_email
from app.services.sanction_email_texts import DEFAULT_LANGUAGE, SanctionEmailContent, texts_for
from app.services.site_settings import contact_email

logger = logging.getLogger(__name__)

_MODES_LATIN = {"gauntlet": "Gauntlet", "chaos": "Chaos Streak", "history": "History Streak", "page_streak": "Page Streak"}

_TEXTS: dict[str, dict] = {
    "en": {
        "modes": _MODES_LATIN,
        "subject": "Your progress in a challenge was reset",
        "headline": "After a review by the LemonDBD team, your progress in {challenge} was reset because it broke our fair play rules.",
        "meaning": "The run, match history and completions in this challenge were deleted, so you can start it again from the beginning. Your account and your other challenges are not affected.",
        "note_label": "Note from the team (written in the moderator's language)",
    },
    "pl": {
        "modes": _MODES_LATIN,
        "subject": "Postęp w Twoim wyzwaniu został zresetowany",
        "headline": "Po przeglądzie zespołu LemonDBD Twój postęp w wyzwaniu {challenge} został zresetowany, ponieważ naruszał zasady fair play.",
        "meaning": "Przebieg, historia meczów i ukończenia w tym wyzwaniu zostały usunięte, więc możesz zacząć je od nowa. Twoje konto i pozostałe wyzwania nie są naruszone.",
        "note_label": "Notatka od zespołu (w języku moderatora)",
    },
    "de": {
        "modes": _MODES_LATIN,
        "subject": "Dein Fortschritt in einer Challenge wurde zurückgesetzt",
        "headline": "Nach einer Prüfung durch das LemonDBD-Team wurde dein Fortschritt in {challenge} zurückgesetzt, weil er gegen unsere Fair-Play-Regeln verstieß.",
        "meaning": "Lauf, Matchverlauf und Abschlüsse in dieser Challenge wurden gelöscht, du kannst sie also von vorn beginnen. Dein Konto und deine anderen Challenges sind nicht betroffen.",
        "note_label": "Hinweis vom Team (in der Sprache des Moderators)",
    },
    "es": {
        "modes": _MODES_LATIN,
        "subject": "Tu progreso en un desafío fue restablecido",
        "headline": "Tras una revisión del equipo de LemonDBD, tu progreso en {challenge} fue restablecido porque incumplía nuestras normas de juego limpio.",
        "meaning": "La partida, el historial de combates y las victorias de este desafío se eliminaron, así que puedes empezarlo de nuevo. Tu cuenta y tus otros desafíos no se ven afectados.",
        "note_label": "Nota del equipo (escrita en el idioma del moderador)",
    },
    "ja": {
        "modes": {"gauntlet": "ガントレット", "chaos": "カオスストリーク", "history": "ヒストリーストリーク", "page_streak": "ページストリーク"},
        "subject": "チャレンジの進行状況がリセットされました",
        "headline": "LemonDBDチームによる確認の結果、フェアプレー規則に反していたため、{challenge} の進行状況をリセットしました。",
        "meaning": "このチャレンジの進行状況、対戦履歴、クリア記録は削除されたため、最初からやり直せます。アカウントやほかのチャレンジには影響ありません。",
        "note_label": "チームからのメモ（モデレーターの言語で記載）",
    },
}


def challenge_label(language: str | None, mode: str, variant: str) -> str:
    """"Chaos Streak: Easy": the mode in the player's language and the variant as the admin panel names it."""
    spaced = variant.replace("_", " ")
    return f"{_TEXTS.get(language or '', _TEXTS[DEFAULT_LANGUAGE])['modes'][mode]}: {spaced[:1].upper()}{spaced[1:]}"


def build_challenge_reset_email(
    language: str | None, *, username: str, mode: str, variant: str, note: str | None = None, rules_url: str = ""
) -> SanctionEmailContent:
    own = _TEXTS.get(language or "", _TEXTS[DEFAULT_LANGUAGE])
    shared = texts_for(language)
    rule_text = shared["rule_format"].format(number=RULE_SECTION_NUMBERS["fairPlay"], name=shared["rules"]["fairPlay"])
    if rules_url:
        rule_text += f" ({rules_url})"
    contact = contact_email()
    blocks: list[tuple[str, ...]] = [
        ("p", shared["greeting"].format(name=username)),
        ("p", own["headline"].format(challenge=challenge_label(language, mode, variant))),
        ("p", own["meaning"]),
        ("field", shared["rule_label"], rule_text),
    ]
    if note:
        blocks.append(("quote", own["note_label"], note))
    blocks.append(("p", shared["human_review"]))
    blocks.append(("p", shared["appeal"].format(contact=contact) if contact else shared["appeal_no_contact"]))
    blocks.append(("p", shared["redress"]))
    return SanctionEmailContent(subject=own["subject"], preheader=own["subject"], footer=shared["footer"], blocks=blocks)


def notify_challenge_reset(user: User, mode: str, variant: str, note: str | None) -> bool:
    """Emails the player that their progress in a challenge was reset. False, logged, when it could not be
    sent: the reset has already happened and must not be undone by a mail failure."""
    language = user.preferred_language
    base = str(current_app.config.get("FRONTEND_URL") or "").rstrip("/")
    try:
        content = build_challenge_reset_email(
            language, username=user.username, mode=mode, variant=variant, note=note,
            rules_url=f"{base}/{language or DEFAULT_LANGUAGE}/rules" if base else "",
        )
        send_sanction_email(user, content)
    except Exception as err:
        logger.warning("Failed to send the challenge reset notice to user %s: %s", user.id, err)
        return False
    return True
