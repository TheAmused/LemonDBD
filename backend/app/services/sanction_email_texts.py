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
from app.core.rule_sections import RULE_SECTION_NUMBERS

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
        "rule_format": "Section {number}: {name}",
        "what_heading": "What happened",
        "why_heading": "Why",
        "options_heading": "Your options",
        "content_subject": "Your {content} was blocked",
        "content_what": "After a review by the LemonDBD team, a {content} created with your account was blocked. It can no longer be imported or opened on LemonDBD, and the copy saved in your browser is removed the next time you visit. Edited versions are separate content and are not affected, but they must follow the Rules too.",
        "deactivated": "Because of the seriousness of the breach, your account has also been deactivated.",
        "human_review": "This decision was made by a member of the LemonDBD team after human review. No automated decision-making was used.",
        "report_note": "It followed a report from another user.",
        "content_blocked": "The content concerned ({content}) was also blocked: it can no longer be imported or opened on LemonDBD, and the copy saved in your browser is removed the next time you visit.",
        "appeal": "If you think we got this wrong, write to {contact} within 6 months and we will review the decision and reply, normally within 14 days.",
        "appeal_no_contact": "If you think we got this wrong, contact the LemonDBD team within 6 months and we will review the decision and reply, normally within 14 days.",
        "terms_more": "More about contesting a decision, and about your other rights, is in our Terms of Service: {url}",
        "terms_more_no_link": "More about contesting a decision, and about your other rights, is in our Terms of Service.",
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
        "rule_format": "Sekcja {number}: {name}",
        "what_heading": "Co się stało",
        "why_heading": "Dlaczego",
        "options_heading": "Twoje możliwości",
        "content_subject": "Twoja treść została zablokowana ({content})",
        "content_what": "Po przeglądzie zespołu LemonDBD treść utworzona na Twoim koncie ({content}) została zablokowana. Nie można jej już zaimportować ani otworzyć w LemonDBD, a kopia zapisana w Twojej przeglądarce zostanie usunięta przy następnej wizycie. Edytowane wersje to osobne treści i ta decyzja ich nie obejmuje, ale również muszą przestrzegać Zasad.",
        "deactivated": "Ze względu na wagę naruszenia Twoje konto zostało również dezaktywowane.",
        "human_review": "Decyzję podjął członek zespołu LemonDBD po weryfikacji przez człowieka. Nie zastosowano zautomatyzowanego podejmowania decyzji.",
        "report_note": "Poprzedziło ją zgłoszenie innego użytkownika.",
        "content_blocked": "Zablokowano również objętą sprawą treść ({content}): nie można jej już zaimportować ani otworzyć w LemonDBD, a kopia zapisana w Twojej przeglądarce zostanie usunięta przy następnej wizycie.",
        "appeal": "Jeśli uważasz, że popełniliśmy błąd, napisz w ciągu 6 miesięcy na {contact}, a ponownie rozpatrzymy decyzję i odpowiemy, co do zasady w ciągu 14 dni.",
        "appeal_no_contact": "Jeśli uważasz, że popełniliśmy błąd, skontaktuj się z zespołem LemonDBD w ciągu 6 miesięcy, a ponownie rozpatrzymy decyzję i odpowiemy, co do zasady w ciągu 14 dni.",
        "terms_more": "Więcej o odwołaniu od decyzji i o Twoich pozostałych prawach znajdziesz w naszym Regulaminie: {url}",
        "terms_more_no_link": "Więcej o odwołaniu od decyzji i o Twoich pozostałych prawach znajdziesz w naszym Regulaminie.",
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
        "rule_format": "Abschnitt {number}: {name}",
        "what_heading": "Was passiert ist",
        "why_heading": "Warum",
        "options_heading": "Deine Möglichkeiten",
        "content_subject": "Dein Inhalt wurde gesperrt ({content})",
        "content_what": "Nach einer Prüfung durch das LemonDBD-Team wurde ein mit deinem Konto erstellter Inhalt ({content}) gesperrt. Er kann auf LemonDBD nicht mehr importiert oder geöffnet werden, und die in deinem Browser gespeicherte Kopie wird bei deinem nächsten Besuch entfernt. Bearbeitete Versionen sind eigene Inhalte und nicht betroffen, müssen aber ebenfalls die Regeln einhalten.",
        "deactivated": "Wegen der Schwere des Verstoßes wurde dein Konto außerdem deaktiviert.",
        "human_review": "Diese Entscheidung hat ein Mitglied des LemonDBD-Teams nach menschlicher Prüfung getroffen. Es wurde keine automatisierte Entscheidungsfindung eingesetzt.",
        "report_note": "Ihr ging eine Meldung eines anderen Nutzers voraus.",
        "content_blocked": "Der betroffene Inhalt ({content}) wurde ebenfalls gesperrt: Er kann auf LemonDBD nicht mehr importiert oder geöffnet werden, und die in deinem Browser gespeicherte Kopie wird bei deinem nächsten Besuch entfernt.",
        "appeal": "Wenn du glaubst, dass wir uns geirrt haben, schreibe uns innerhalb von 6 Monaten an {contact}; wir prüfen die Entscheidung erneut und antworten in der Regel innerhalb von 14 Tagen.",
        "appeal_no_contact": "Wenn du glaubst, dass wir uns geirrt haben, wende dich innerhalb von 6 Monaten an das LemonDBD-Team; wir prüfen die Entscheidung erneut und antworten in der Regel innerhalb von 14 Tagen.",
        "terms_more": "Mehr dazu, wie du eine Entscheidung anfechten kannst, und zu deinen weiteren Rechten findest du in unseren Nutzungsbedingungen: {url}",
        "terms_more_no_link": "Mehr dazu, wie du eine Entscheidung anfechten kannst, und zu deinen weiteren Rechten findest du in unseren Nutzungsbedingungen.",
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
        "rule_format": "Sección {number}: {name}",
        "what_heading": "Qué ocurrió",
        "why_heading": "Por qué",
        "options_heading": "Tus opciones",
        "content_subject": "Tu contenido fue bloqueado ({content})",
        "content_what": "Tras una revisión del equipo de LemonDBD, un contenido creado con tu cuenta ({content}) fue bloqueado. Ya no se puede importar ni abrir en LemonDBD, y la copia guardada en tu navegador se eliminará la próxima vez que lo visites. Las versiones editadas son contenido aparte y no se ven afectadas, pero también deben cumplir las Reglas.",
        "deactivated": "Por la gravedad del incumplimiento, tu cuenta también ha sido desactivada.",
        "human_review": "Esta decisión la tomó un miembro del equipo de LemonDBD tras una revisión humana. No se utilizó ninguna toma de decisiones automatizada.",
        "report_note": "Fue precedida por una denuncia de otro usuario.",
        "content_blocked": "El contenido afectado ({content}) también fue bloqueado: ya no se puede importar ni abrir en LemonDBD, y la copia guardada en tu navegador se eliminará la próxima vez que lo visites.",
        "appeal": "Si crees que nos hemos equivocado, escribe a {contact} en un plazo de 6 meses y revisaremos la decisión y responderemos, normalmente en un plazo de 14 días.",
        "appeal_no_contact": "Si crees que nos hemos equivocado, ponte en contacto con el equipo de LemonDBD en un plazo de 6 meses y revisaremos la decisión y responderemos, normalmente en un plazo de 14 días.",
        "terms_more": "Encontrarás más información sobre cómo impugnar una decisión y sobre tus demás derechos en nuestras Condiciones de servicio: {url}",
        "terms_more_no_link": "Encontrarás más información sobre cómo impugnar una decisión y sobre tus demás derechos en nuestras Condiciones de servicio.",
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
        "rule_format": "第{number}節：{name}",
        "what_heading": "経緯",
        "why_heading": "理由",
        "options_heading": "対応について",
        "content_subject": "コンテンツがブロックされました（{content}）",
        "content_what": "LemonDBDチームによる確認の結果、お客様のアカウントで作成されたコンテンツ（{content}）をブロックしました。LemonDBDでインポートまたは開くことはできなくなり、ブラウザに保存されたコピーは次回の訪問時に削除されます。編集版は別のコンテンツであり、この決定の対象外ですが、ルールを守っていただく必要があります。",
        "deactivated": "違反の重大性により、アカウントも無効化されました。",
        "human_review": "この決定は、LemonDBDチームのメンバーが人による確認を経て行いました。自動化された意思決定は使用していません。",
        "report_note": "他のユーザーからの報告を受けて行われました。",
        "content_blocked": "対象のコンテンツ（{content}）もブロックされました。LemonDBDでインポートまたは開くことはできなくなり、ブラウザに保存されたコピーは次回の訪問時に削除されます。",
        "appeal": "決定に誤りがあると思われる場合は、6か月以内に{contact}までご連絡ください。決定を再審査し、原則として14日以内に回答いたします。",
        "appeal_no_contact": "決定に誤りがあると思われる場合は、6か月以内にLemonDBDチームまでご連絡ください。決定を再審査し、原則として14日以内に回答いたします。",
        "terms_more": "決定への異議申し立て方法やその他のお客様の権利については、利用規約をご覧ください: {url}",
        "terms_more_no_link": "決定への異議申し立て方法やその他のお客様の権利については、利用規約をご覧ください。",
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
    #: ("p", text) plain paragraph; ("field", label, value); ("title", text) the headline;
    #: ("heading", text) opens a section; ("note", text) the moderator's own words as plain italic text.
    blocks: list[tuple[str, ...]] = field(default_factory=list)
    #: Red bar on the top edge of the card.
    accent_bar: bool = False


def options_blocks(t: dict, contact: str, terms_url: str) -> list[tuple[str, ...]]:
    """The "Your options" section: how to contest the decision, and where the Terms say more about it."""
    return [
        ("heading", t["options_heading"]),
        ("p", t["appeal"].format(contact=contact) if contact else t["appeal_no_contact"]),
        ("p", t["terms_more"].format(url=terms_url) if terms_url else t["terms_more_no_link"]),
    ]


def build_sanction_email(
    language: str | None,
    *,
    event: str,
    kind: str,
    username: str,
    reason_code: str,
    rule_ref: str | None = None,
    facts: str | None = None,
    issued_at: datetime | None = None,
    until: datetime | None = None,
    from_report: bool = False,
    content_type: str | None = None,
    contact: str = "",
    rules_url: str = "",
    terms_url: str = "",
) -> SanctionEmailContent:
    """The email for `event` ("issued", "lifted" or "ended") about a sanction of `kind`.

    Laid out like every moderation email: greeting, title, then the sections what happened, why (the reason,
    the Rules section and the moderator's own words explaining the situation) and the account holder's
    options, with who decided in the footer.
    """
    t = texts_for(language)
    greeting = ("p", t["greeting"].format(name=username))

    if event in ("lifted", "ended"):
        body = t["lifted_body"].format(date=format_moment(issued_at)) if event == "lifted" else t["ended_body"]
        return SanctionEmailContent(
            subject=t["subject"][event],
            preheader=t["subject"][event],
            footer=t["footer"],
            blocks=[greeting, ("title", t["subject"][event]), ("p", body)],
        )

    blocks: list[tuple[str, ...]] = [
        greeting,
        ("title", t["subject"][kind]),
        ("heading", t["what_heading"]),
        ("p", t["headline"][kind].format(until=format_moment(until))),
        ("p", t["meaning"][kind]),
    ]
    has_content = bool(content_type and content_type in t["content_names"])
    if has_content:
        blocks.append(("p", t["content_blocked"].format(content=t["content_names"][content_type])))
    blocks.append(("heading", t["why_heading"]))
    blocks.append(("field", t["reason_label"], t["reasons"].get(reason_code, t["reasons"]["other"])))
    if rule_ref and rule_ref in t["rules"]:
        rule_text = t["rule_format"].format(number=RULE_SECTION_NUMBERS[rule_ref], name=t["rules"][rule_ref])
        if rules_url:
            rule_text += f" ({rules_url})"
        blocks.append(("field", t["rule_label"], rule_text))
    if facts:
        blocks.append(("note", facts))
    blocks += options_blocks(t, contact, terms_url)
    return SanctionEmailContent(
        subject=t["subject"][kind],
        preheader=t["subject"][kind],
        footer=t["human_review"] + (" " + t["report_note"] if from_report else ""),
        blocks=blocks,
        accent_bar=True,
    )


def build_content_blocked_email(
    language: str | None,
    *,
    username: str,
    content_type: str,
    reason_code: str,
    account_deactivated: bool,
    contact: str = "",
    terms_url: str = "",
) -> SanctionEmailContent:
    """The statement of reasons for content that was blocked on its own, with no account decision beside it."""
    t = texts_for(language)
    content = t["content_names"].get(content_type, content_type.replace("_", " "))
    subject = t["content_subject"].format(content=content)
    what = t["content_what"].format(content=content)
    blocks: list[tuple[str, ...]] = [
        ("p", t["greeting"].format(name=username)),
        ("title", subject),
        ("heading", t["what_heading"]),
        ("p", what),
    ]
    if account_deactivated:
        blocks.append(("p", t["deactivated"]))
    blocks += [
        ("heading", t["why_heading"]),
        ("field", t["reason_label"], t["reasons"].get(reason_code, t["reasons"]["other"])),
        *options_blocks(t, contact, terms_url),
    ]
    return SanctionEmailContent(subject=subject, preheader=subject, footer=t["human_review"], blocks=blocks, accent_bar=True)
