# backend/app/services/sanction_email_texts.py
"""Wording of the moderation emails in every site language (pure: no Flask, no database).

The email is a statement of reasons: what was decided and for how long, why (category, the Rules
section, the facts), that a person decided, how to contest it and which other routes exist. The
moderator's own words (facts, public message) are shown as written, in a block that says so; the
standard wording around them is translated. Never included: who reported, internal notes.
"""
from dataclasses import dataclass, field
from datetime import datetime

from app.core.account_state import as_utc

DEFAULT_LANGUAGE = "en"

_TEXTS: dict[str, dict] = {
    "en": {
        "greeting": "Hi {name},",
        "subject": {
            "warning": "You have received a warning",
            "suspension": "Your account has been suspended",
            "ban": "Your account has been banned",
            "lifted": "A restriction on your account has been lifted",
            "ended": "Your suspension has ended",
        },
        "headline": {
            "warning": "After a review by the LemonDBD team, you have received a warning for a breach of our Terms of Service and Rules.",
            "suspension": "After a review by the LemonDBD team, your account has been suspended until {until}.",
            "ban": "After a review by the LemonDBD team, your account has been permanently banned.",
        },
        "meaning": {
            "warning": "A warning does not restrict your account. Repeated breaches can lead to a suspension or a ban. You will also see this warning when you sign in.",
            "suspension": "Until then you cannot sign in or use features that need an account. Nothing is deleted, and you can sign in again afterwards.",
            "ban": "You can no longer sign in or use features that need an account.",
        },
        "reason_label": "Reason",
        "rule_label": "Rule",
        "rules_word": "Rules",
        "facts_label": "What happened (written in the moderator's language)",
        "note_label": "Message from the moderation team (written in the moderator's language)",
        "human_review": "This decision was made by a member of the LemonDBD team after human review. No automated decision-making was used.",
        "report_note": "It followed a report from another user.",
        "content_blocked": "The content concerned ({content}) was also blocked: it can no longer be imported or opened on LemonDBD, and the copy saved in your browser is removed the next time you visit.",
        "appeal": "If you think we got this wrong, write to {contact} within 14 days and we will review the decision.",
        "appeal_no_contact": "If you think we got this wrong, contact the LemonDBD team within 14 days and we will review the decision.",
        "redress": "You can also turn to an out-of-court dispute settlement body or bring the matter before a court in your country.",
        "lifted_body": "The restriction placed on your account on {date} has been lifted. You can use your account again.",
        "ended_body": "Your suspension has ended. You can use your account again. Please keep to our Terms of Service and Rules.",
        "footer": "Sent by LemonDBD because of a moderation decision about your account.",
        "reasons": {
            "hate_speech": "hate speech or discrimination",
            "harassment": "harassment",
            "explicit": "explicit or inappropriate content",
            "illegal": "illegal content",
            "spam": "spam",
            "cheating": "cheating",
            "ban_evasion": "evading a ban",
            "other": "a breach of our Rules",
        },
        "rules": {
            "respect": "Respect",
            "fairPlay": "Fair play",
            "yourContent": "Your content",
            "smashOrPass": "Smash or Pass etiquette",
            "serverCare": "Care for the servers",
            "reporting": "Reporting",
            "enforcement": "Enforcement",
        },
        "content_names": {"tier_list": "tier list", "smash_roster": "Smash or Pass roster", "minigame": "minigame"},
    },
    "pl": {
        "greeting": "Cześć {name},",
        "subject": {
            "warning": "Ostrzeżenie dla Twojego konta",
            "suspension": "Twoje konto zostało zawieszone",
            "ban": "Twoje konto zostało zablokowane na stałe",
            "lifted": "Ograniczenie Twojego konta zostało zniesione",
            "ended": "Zawieszenie Twojego konta dobiegło końca",
        },
        "headline": {
            "warning": "Po przeglądzie zespołu LemonDBD Twoje konto otrzymało ostrzeżenie za naruszenie Regulaminu i Zasad.",
            "suspension": "Po przeglądzie zespołu LemonDBD Twoje konto zostało zawieszone do {until}.",
            "ban": "Po przeglądzie zespołu LemonDBD Twoje konto zostało zablokowane na stałe.",
        },
        "meaning": {
            "warning": "Ostrzeżenie nie ogranicza konta. Powtarzające się naruszenia mogą skutkować zawieszeniem lub blokadą. Zobaczysz je również po zalogowaniu.",
            "suspension": "Do tego czasu nie możesz się logować ani korzystać z funkcji wymagających konta. Nic nie jest usuwane, a po zakończeniu zawieszenia możesz zalogować się ponownie.",
            "ban": "Nie możesz już się logować ani korzystać z funkcji wymagających konta.",
        },
        "reason_label": "Powód",
        "rule_label": "Zasada",
        "rules_word": "Zasady",
        "facts_label": "Co się wydarzyło (w języku moderatora)",
        "note_label": "Wiadomość od zespołu moderacji (w języku moderatora)",
        "human_review": "Decyzję podjął członek zespołu LemonDBD po weryfikacji przez człowieka. Nie zastosowano zautomatyzowanego podejmowania decyzji.",
        "report_note": "Poprzedziło ją zgłoszenie innego użytkownika.",
        "content_blocked": "Zablokowano również objętą sprawą treść ({content}): nie można jej już zaimportować ani otworzyć w LemonDBD, a kopia zapisana w Twojej przeglądarce zostanie usunięta przy następnej wizycie.",
        "appeal": "Jeśli uważasz, że popełniliśmy błąd, napisz w ciągu 14 dni na {contact}, a ponownie rozpatrzymy decyzję.",
        "appeal_no_contact": "Jeśli uważasz, że popełniliśmy błąd, skontaktuj się z zespołem LemonDBD w ciągu 14 dni, a ponownie rozpatrzymy decyzję.",
        "redress": "Możesz też skorzystać z pozasądowego organu rozstrzygania sporów albo wnieść sprawę do sądu w swoim kraju.",
        "lifted_body": "Ograniczenie nałożone na Twoje konto dnia {date} zostało zniesione. Możesz znów korzystać z konta.",
        "ended_body": "Zawieszenie dobiegło końca. Możesz znów korzystać z konta. Pamiętaj o przestrzeganiu Regulaminu i Zasad.",
        "footer": "Wiadomość wysłana przez LemonDBD w związku z decyzją moderacyjną dotyczącą Twojego konta.",
        "reasons": {
            "hate_speech": "mowa nienawiści lub dyskryminacja",
            "harassment": "nękanie",
            "explicit": "treści wulgarne lub nieodpowiednie",
            "illegal": "treści nielegalne",
            "spam": "spam",
            "cheating": "oszukiwanie",
            "ban_evasion": "obejście blokady",
            "other": "naruszenie Zasad",
        },
        "rules": {
            "respect": "Szacunek",
            "fairPlay": "Fair play",
            "yourContent": "Twoje treści",
            "smashOrPass": "Etykieta Smash or Pass",
            "serverCare": "Dbanie o serwery",
            "reporting": "Zgłaszanie",
            "enforcement": "Egzekwowanie zasad",
        },
        "content_names": {"tier_list": "lista tierów", "smash_roster": "skład Smash or Pass", "minigame": "minigra"},
    },
    "de": {
        "greeting": "Hallo {name},",
        "subject": {
            "warning": "Verwarnung für dein Konto",
            "suspension": "Dein Konto wurde vorübergehend gesperrt",
            "ban": "Dein Konto wurde dauerhaft gesperrt",
            "lifted": "Eine Einschränkung deines Kontos wurde aufgehoben",
            "ended": "Deine Sperre ist beendet",
        },
        "headline": {
            "warning": "Nach einer Prüfung durch das LemonDBD-Team hast du wegen eines Verstoßes gegen unsere Nutzungsbedingungen und Regeln eine Verwarnung erhalten.",
            "suspension": "Nach einer Prüfung durch das LemonDBD-Team wurde dein Konto bis {until} vorübergehend gesperrt.",
            "ban": "Nach einer Prüfung durch das LemonDBD-Team wurde dein Konto dauerhaft gesperrt.",
        },
        "meaning": {
            "warning": "Eine Verwarnung schränkt dein Konto nicht ein. Wiederholte Verstöße können zu einer Sperre führen. Du siehst die Verwarnung auch bei der Anmeldung.",
            "suspension": "Bis dahin kannst du dich nicht anmelden und keine Funktionen nutzen, die ein Konto brauchen. Nichts wird gelöscht; danach kannst du dich wieder anmelden.",
            "ban": "Du kannst dich nicht mehr anmelden und keine Funktionen nutzen, die ein Konto brauchen.",
        },
        "reason_label": "Grund",
        "rule_label": "Regel",
        "rules_word": "Regeln",
        "facts_label": "Was passiert ist (in der Sprache des Moderators)",
        "note_label": "Nachricht des Moderationsteams (in der Sprache des Moderators)",
        "human_review": "Diese Entscheidung hat ein Mitglied des LemonDBD-Teams nach menschlicher Prüfung getroffen. Es wurde keine automatisierte Entscheidungsfindung eingesetzt.",
        "report_note": "Ihr ging eine Meldung eines anderen Nutzers voraus.",
        "content_blocked": "Der betroffene Inhalt ({content}) wurde ebenfalls gesperrt: Er kann auf LemonDBD nicht mehr importiert oder geöffnet werden, und die in deinem Browser gespeicherte Kopie wird bei deinem nächsten Besuch entfernt.",
        "appeal": "Wenn du glaubst, dass wir uns geirrt haben, schreibe uns innerhalb von 14 Tagen an {contact}; wir prüfen die Entscheidung erneut.",
        "appeal_no_contact": "Wenn du glaubst, dass wir uns geirrt haben, wende dich innerhalb von 14 Tagen an das LemonDBD-Team; wir prüfen die Entscheidung erneut.",
        "redress": "Du kannst dich außerdem an eine außergerichtliche Streitbeilegungsstelle wenden oder den Rechtsweg vor einem Gericht in deinem Land beschreiten.",
        "lifted_body": "Die am {date} verhängte Einschränkung deines Kontos wurde aufgehoben. Du kannst dein Konto wieder nutzen.",
        "ended_body": "Deine Sperre ist beendet. Du kannst dein Konto wieder nutzen. Bitte halte dich an unsere Nutzungsbedingungen und Regeln.",
        "footer": "Gesendet von LemonDBD wegen einer Moderationsentscheidung zu deinem Konto.",
        "reasons": {
            "hate_speech": "Hassrede oder Diskriminierung",
            "harassment": "Belästigung",
            "explicit": "explizite oder unangemessene Inhalte",
            "illegal": "illegale Inhalte",
            "spam": "Spam",
            "cheating": "Betrug",
            "ban_evasion": "Umgehung einer Sperre",
            "other": "ein Verstoß gegen unsere Regeln",
        },
        "rules": {
            "respect": "Respekt",
            "fairPlay": "Fair Play",
            "yourContent": "Deine Inhalte",
            "smashOrPass": "Smash-or-Pass-Etikette",
            "serverCare": "Rücksicht auf die Server",
            "reporting": "Melden",
            "enforcement": "Durchsetzung",
        },
        "content_names": {"tier_list": "Tierliste", "smash_roster": "Smash-or-Pass-Roster", "minigame": "Minispiel"},
    },
    "es": {
        "greeting": "Hola {name}:",
        "subject": {
            "warning": "Has recibido una advertencia",
            "suspension": "Tu cuenta ha sido suspendida",
            "ban": "Tu cuenta ha sido bloqueada de forma permanente",
            "lifted": "Se ha levantado una restricción de tu cuenta",
            "ended": "Tu suspensión ha terminado",
        },
        "headline": {
            "warning": "Tras una revisión del equipo de LemonDBD, has recibido una advertencia por incumplir nuestras Condiciones de servicio y Reglas.",
            "suspension": "Tras una revisión del equipo de LemonDBD, tu cuenta ha sido suspendida hasta el {until}.",
            "ban": "Tras una revisión del equipo de LemonDBD, tu cuenta ha sido bloqueada de forma permanente.",
        },
        "meaning": {
            "warning": "Una advertencia no restringe tu cuenta. Los incumplimientos repetidos pueden llevar a una suspensión o a un bloqueo. También verás esta advertencia al iniciar sesión.",
            "suspension": "Hasta entonces no puedes iniciar sesión ni usar las funciones que requieren una cuenta. No se elimina nada y podrás volver a iniciar sesión después.",
            "ban": "Ya no puedes iniciar sesión ni usar las funciones que requieren una cuenta.",
        },
        "reason_label": "Motivo",
        "rule_label": "Regla",
        "rules_word": "Reglas",
        "facts_label": "Qué ocurrió (en el idioma del moderador)",
        "note_label": "Mensaje del equipo de moderación (en el idioma del moderador)",
        "human_review": "Esta decisión la tomó un miembro del equipo de LemonDBD tras una revisión humana. No se utilizó ninguna toma de decisiones automatizada.",
        "report_note": "Fue precedida por una denuncia de otro usuario.",
        "content_blocked": "El contenido afectado ({content}) también fue bloqueado: ya no se puede importar ni abrir en LemonDBD, y la copia guardada en tu navegador se eliminará la próxima vez que lo visites.",
        "appeal": "Si crees que nos hemos equivocado, escribe a {contact} en un plazo de 14 días y revisaremos la decisión.",
        "appeal_no_contact": "Si crees que nos hemos equivocado, ponte en contacto con el equipo de LemonDBD en un plazo de 14 días y revisaremos la decisión.",
        "redress": "También puedes acudir a un organismo de resolución extrajudicial de litigios o llevar el asunto ante un tribunal de tu país.",
        "lifted_body": "Se ha levantado la restricción impuesta a tu cuenta el {date}. Ya puedes volver a usar tu cuenta.",
        "ended_body": "Tu suspensión ha terminado. Ya puedes volver a usar tu cuenta. Respeta nuestras Condiciones de servicio y Reglas.",
        "footer": "Enviado por LemonDBD a raíz de una decisión de moderación sobre tu cuenta.",
        "reasons": {
            "hate_speech": "discurso de odio o discriminación",
            "harassment": "acoso",
            "explicit": "contenido explícito o inapropiado",
            "illegal": "contenido ilegal",
            "spam": "spam",
            "cheating": "trampas",
            "ban_evasion": "elusión de un bloqueo",
            "other": "un incumplimiento de nuestras Reglas",
        },
        "rules": {
            "respect": "Respeto",
            "fairPlay": "Juego limpio",
            "yourContent": "Tu contenido",
            "smashOrPass": "Etiqueta de Smash or Pass",
            "serverCare": "Cuidado de los servidores",
            "reporting": "Denuncias",
            "enforcement": "Aplicación de las reglas",
        },
        "content_names": {"tier_list": "lista de tiers", "smash_roster": "plantilla de Smash or Pass", "minigame": "minijuego"},
    },
    "ja": {
        "greeting": "{name} 様",
        "subject": {
            "warning": "アカウントへの警告",
            "suspension": "アカウントが一時停止されました",
            "ban": "アカウントが永久停止されました",
            "lifted": "アカウントの制限が解除されました",
            "ended": "一時停止が終了しました",
        },
        "headline": {
            "warning": "LemonDBDチームによる審査の結果、利用規約およびルールへの違反により、警告が行われました。",
            "suspension": "LemonDBDチームによる審査の結果、お客様のアカウントは{until}まで一時停止されました。",
            "ban": "LemonDBDチームによる審査の結果、お客様のアカウントは永久に停止されました。",
        },
        "meaning": {
            "warning": "警告によってアカウントが制限されることはありません。違反が繰り返された場合は、一時停止または永久停止となることがあります。サインイン時にもこの警告が表示されます。",
            "suspension": "それまでの間は、サインインやアカウントが必要な機能の利用はできません。データが削除されることはなく、終了後は再びサインインできます。",
            "ban": "サインインやアカウントが必要な機能は利用できなくなります。",
        },
        "reason_label": "理由",
        "rule_label": "ルール",
        "rules_word": "ルール",
        "facts_label": "経緯（モデレーターの言語で記載）",
        "note_label": "モデレーションチームからのメッセージ（モデレーターの言語で記載）",
        "human_review": "この決定は、LemonDBDチームのメンバーが人による確認を経て行いました。自動化された意思決定は使用していません。",
        "report_note": "他のユーザーからの報告を受けて行われました。",
        "content_blocked": "対象のコンテンツ（{content}）もブロックされました。LemonDBDでインポートまたは開くことはできなくなり、ブラウザに保存されたコピーは次回の訪問時に削除されます。",
        "appeal": "決定に誤りがあると思われる場合は、14日以内に{contact}までご連絡ください。決定を再審査いたします。",
        "appeal_no_contact": "決定に誤りがあると思われる場合は、14日以内にLemonDBDチームまでご連絡ください。決定を再審査いたします。",
        "redress": "また、裁判外紛争解決機関を利用することや、お住まいの国の裁判所に申し立てることもできます。",
        "lifted_body": "{date}にお客様のアカウントに課された制限は解除されました。アカウントを再び利用できます。",
        "ended_body": "一時停止は終了しました。アカウントを再び利用できます。利用規約とルールをお守りください。",
        "footer": "このメールは、お客様のアカウントに関するモデレーション決定のためLemonDBDから送信されました。",
        "reasons": {
            "hate_speech": "ヘイトスピーチまたは差別",
            "harassment": "嫌がらせ",
            "explicit": "露骨または不適切なコンテンツ",
            "illegal": "違法なコンテンツ",
            "spam": "スパム",
            "cheating": "不正行為",
            "ban_evasion": "停止措置の回避",
            "other": "ルール違反",
        },
        "rules": {
            "respect": "リスペクト",
            "fairPlay": "フェアプレー",
            "yourContent": "あなたのコンテンツ",
            "smashOrPass": "Smash or Passのマナー",
            "serverCare": "サーバーへの配慮",
            "reporting": "報告",
            "enforcement": "ルールの執行",
        },
        "content_names": {"tier_list": "ティアリスト", "smash_roster": "Smash or Passのロスター", "minigame": "ミニゲーム"},
    },
}

SUPPORTED = tuple(_TEXTS)


def texts_for(language: str | None) -> dict:
    return _TEXTS.get(language or "", _TEXTS[DEFAULT_LANGUAGE])


def format_moment(value: datetime | None) -> str:
    moment = as_utc(value)
    return moment.strftime("%Y-%m-%d %H:%M UTC") if moment else ""


@dataclass
class SanctionEmailContent:
    subject: str
    preheader: str
    footer: str
    #: ("p", text) plain paragraph; ("field", label, value); ("quote", label, value) for the
    #: moderator's own words.
    blocks: list[tuple[str, ...]] = field(default_factory=list)


def build_sanction_email(
    language: str | None,
    *,
    event: str,
    kind: str,
    username: str,
    reason_code: str,
    rule_ref: str | None = None,
    facts: str | None = None,
    public_message: str | None = None,
    issued_at: datetime | None = None,
    until: datetime | None = None,
    from_report: bool = False,
    content_type: str | None = None,
    contact: str = "",
    rules_url: str = "",
) -> SanctionEmailContent:
    """The email for `event` ("issued", "lifted" or "ended") about a sanction of `kind`."""
    t = texts_for(language)
    greeting = t["greeting"].format(name=username)
    footer = t["footer"]

    if event == "lifted":
        body = t["lifted_body"].format(date=format_moment(issued_at))
        return SanctionEmailContent(
            subject=t["subject"]["lifted"],
            preheader=t["subject"]["lifted"],
            footer=footer,
            blocks=[("p", greeting), ("p", body)],
        )
    if event == "ended":
        return SanctionEmailContent(
            subject=t["subject"]["ended"],
            preheader=t["subject"]["ended"],
            footer=footer,
            blocks=[("p", greeting), ("p", t["ended_body"])],
        )

    headline = t["headline"][kind].format(until=format_moment(until))
    blocks: list[tuple[str, ...]] = [("p", greeting), ("p", headline), ("p", t["meaning"][kind])]
    reason_name = t["reasons"].get(reason_code, t["reasons"]["other"])
    blocks.append(("field", t["reason_label"], reason_name))
    if rule_ref and rule_ref in t["rules"]:
        rule_text = f'{t["rules_word"]}: {t["rules"][rule_ref]}'
        if rules_url:
            rule_text += f" ({rules_url})"
        blocks.append(("field", t["rule_label"], rule_text))
    if facts:
        blocks.append(("quote", t["facts_label"], facts))
    if public_message:
        blocks.append(("quote", t["note_label"], public_message))
    blocks.append(("p", t["human_review"] + (" " + t["report_note"] if from_report else "")))
    if content_type and content_type in t["content_names"]:
        blocks.append(("p", t["content_blocked"].format(content=t["content_names"][content_type])))
    blocks.append(("p", t["appeal"].format(contact=contact) if contact else t["appeal_no_contact"]))
    blocks.append(("p", t["redress"]))
    return SanctionEmailContent(
        subject=t["subject"][kind], preheader=t["subject"][kind], footer=footer, blocks=blocks
    )
