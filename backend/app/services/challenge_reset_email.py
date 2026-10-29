# backend/app/services/challenge_reset_email.py
"""The email a player gets when an admin resets their progress in a challenge.

It is built like every moderation email (see sanction_email_texts): greeting, title, then the sections what
happened, why (with the admin's optional note, shown as written) and the player's options, with the fact that
a person decided in the footer. Who reported or any internal notes are never included.
"""
import logging

from app.models import User
from app.services.mail_service import send_sanction_email
from app.services.sanction_email_texts import DEFAULT_LANGUAGE, SanctionEmailContent, options_blocks, texts_for
from app.services.site_settings import contact_email
from app.utils.site_urls import site_page_url

logger = logging.getLogger(__name__)

_MODES_LATIN = {"gauntlet": "Gauntlet", "chaos": "Chaos Streak", "history": "History Streak", "id_please": "ID, Please", "id_please_survivor": "ID, Please (Survivor)", "id_please_killer": "ID, Please (Killer)", "page_streak": "Page Streak"}

_TEXTS: dict[str, dict] = {
    "en": {
        "modes": _MODES_LATIN,
        "subject": "Your progress in a challenge was reset",
        "title": "Your progress in {challenge} was reset",
        "what": "After a review by the LemonDBD team, the run, match history and completions in this challenge were deleted. You can start it again from the beginning. Your account and your other challenges are not affected.",
        "why": "Your actions broke the Fair play section of our Rules.",
        "why_link": "Your actions broke the Fair play section of our Rules: {url}",
    },
    "pl": {
        "modes": _MODES_LATIN,
        "subject": "Postęp w Twoim wyzwaniu został zresetowany",
        "title": "Twój postęp w wyzwaniu {challenge} został zresetowany",
        "what": "Po przeglądzie zespołu LemonDBD przebieg, historia meczów i ukończenia w tym wyzwaniu zostały usunięte. Możesz zacząć je od nowa. Twoje konto i pozostałe wyzwania nie są naruszone.",
        "why": "Twoje działania naruszyły sekcję Fair play naszych Zasad społeczności.",
        "why_link": "Twoje działania naruszyły sekcję Fair play naszych Zasad społeczności: {url}",
    },
    "de": {
        "modes": _MODES_LATIN,
        "subject": "Dein Fortschritt in einer Challenge wurde zurückgesetzt",
        "title": "Dein Fortschritt in {challenge} wurde zurückgesetzt",
        "what": "Nach einer Prüfung durch das LemonDBD-Team wurden Lauf, Matchverlauf und Abschlüsse in dieser Challenge gelöscht. Du kannst sie von vorn beginnen. Dein Konto und deine anderen Challenges sind nicht betroffen.",
        "why": "Dein Verhalten verstieß gegen den Abschnitt „Fair Play“ unserer Regeln.",
        "why_link": "Dein Verhalten verstieß gegen den Abschnitt „Fair Play“ unserer Regeln: {url}",
    },
    "es": {
        "modes": _MODES_LATIN,
        "subject": "Tu progreso en un desafío fue restablecido",
        "title": "Tu progreso en {challenge} fue restablecido",
        "what": "Tras una revisión del equipo de LemonDBD, se eliminaron la partida, el historial de combates y las victorias de este desafío. Puedes empezarlo de nuevo. Tu cuenta y tus otros desafíos no se ven afectados.",
        "why": "Tus acciones incumplieron la sección «Juego limpio» de nuestras Normas.",
        "why_link": "Tus acciones incumplieron la sección «Juego limpio» de nuestras Normas: {url}",
    },
    "ja": {
        "modes": {"gauntlet": "ガントレット", "chaos": "カオスストリーク", "history": "ヒストリーストリーク", "id_please": "ID, Please", "id_please_survivor": "ID, Please (サバイバー)", "id_please_killer": "ID, Please (キラー)", "page_streak": "ページストリーク"},
        "subject": "チャレンジの進行状況がリセットされました",
        "title": "{challenge} の進行状況がリセットされました",
        "what": "LemonDBDチームによる確認の結果、このチャレンジの進行状況、対戦履歴、クリア記録を削除しました。最初からやり直せます。アカウントやほかのチャレンジには影響ありません。",
        "why": "お客様の行為が、ルールの「フェアプレイ」の項目に反していました。",
        "why_link": "お客様の行為が、ルールの「フェアプレイ」の項目に反していました: {url}",
    },
}


def challenge_label(language: str | None, mode: str, variant: str) -> str:
    """"Chaos Streak: Easy": the mode in the player's language and the variant as the admin panel names it."""
    spaced = variant.replace("_", " ")
    return f"{_TEXTS.get(language or '', _TEXTS[DEFAULT_LANGUAGE])['modes'][mode]}: {spaced[:1].upper()}{spaced[1:]}"


def build_challenge_reset_email(
    language: str | None, *, username: str, mode: str, variant: str, note: str | None = None, rules_url: str = "",
    terms_url: str = "",
) -> SanctionEmailContent:
    own = _TEXTS.get(language or "", _TEXTS[DEFAULT_LANGUAGE])
    shared = texts_for(language)
    blocks: list[tuple[str, ...]] = [
        ("p", shared["greeting"].format(name=username)),
        ("title", own["title"].format(challenge=challenge_label(language, mode, variant))),
        ("heading", shared["what_heading"]),
        ("p", own["what"]),
        ("heading", shared["why_heading"]),
        ("p", own["why_link"].format(url=rules_url) if rules_url else own["why"]),
        *([("note", note)] if note else []),
        *options_blocks(shared, contact_email(), terms_url),
    ]
    return SanctionEmailContent(
        subject=own["subject"], preheader=own["subject"], footer=shared["human_review"], blocks=blocks, accent_bar=True
    )


def notify_challenge_reset(user: User, mode: str, variant: str, note: str | None) -> bool:
    """Emails the player that their progress in a challenge was reset. False, logged, when it could not be
    sent: the reset has already happened and must not be undone by a mail failure."""
    language = user.preferred_language
    try:
        content = build_challenge_reset_email(
            language, username=user.username, mode=mode, variant=variant, note=note,
            rules_url=site_page_url(language, "rules", "fairPlay"),
            terms_url=site_page_url(language, "terms-of-service", "termination"),
        )
        send_sanction_email(user, content)
    except Exception as err:
        logger.warning("Failed to send the challenge reset notice to user %s: %s", user.id, err)
        return False
    return True
