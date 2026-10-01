// frontend/src/locales/de/privacy.ts
export default {
  pageTitle: "LemonDBD - Datenschutzerklärung",
  heading: "Datenschutzerklärung",
  backToAbout: "Zurück zu Über uns",
  layoutHide: "Diesen Block ausblenden",
  layoutShow: "Einblenden",
  layoutDrag: "Zum Umsortieren ziehen",
  layoutHiddenHeading: "Ausgeblendete Blöcke",
  layoutReset: "Layout zurücksetzen",
  lastUpdatedLabel: "Zuletzt aktualisiert",
  lastUpdated: "1. Oktober 2026",
  intro:
    "Diese Seite erklärt, welche personenbezogenen Daten <brand>LemonDBD</brand> erhebt, warum, wer sie sieht und was du damit tun kannst. Wir haben sie bewusst kurz und verständlich gehalten.",
  summaryHeading: "Kurzfassung",
  summary: [
    "Wir erheben nur, was die Seite zum Funktionieren braucht: ein Konto, die Dinge, die du darin speicherst, und grundlegende technische Daten.",
    "Keine Werbung, kein Datenverkauf und kein seitenübergreifendes Tracking.",
    "Unsere Analyse wird selbst gehostet und kommt ohne Cookies aus.",
    "Du kannst jederzeit Auskunft, Berichtigung oder Löschung deiner Daten verlangen.",
  ],
  sections: {
    whoWeAre: {
      heading: "Wer wir sind",
      paragraphs: [
        "<brand>LemonDBD</brand> ist eine kostenlose Fanseite für <i>Dead by Daylight</i>, betrieben vom <brand>LemonTeam</brand>. Wir sind Verantwortliche für die auf dieser Seite beschriebenen personenbezogenen Daten.",
        "<brand>LemonDBD</brand> ist inoffiziell und steht in keiner Verbindung zu Behaviour Interactive Inc. und wird auch nicht von ihr unterstützt. <i>Dead by Daylight</i> sowie Namen, Bilder und weitere Spielinhalte gehören den jeweiligen Rechteinhabern.",
      ],
      items: [],
    },
    dataWeCollect: {
      heading: "Was wir erheben",
      paragraphs: ["Du kannst den Großteil der Seite ohne Konto nutzen. Je nachdem, was du tust, verarbeiten wir:"],
      items: [
        "<b>Kontodaten:</b> Benutzername, E-Mail-Adresse, einen Hash deines Passworts (nie das Passwort selbst), Avatar, bevorzugte Sprache sowie kurzlebige Bestätigungs- und Passwort-Zurücksetzen-Codes.",
        "<b>Was du speicherst:</b> Charakter- und Perk-Besitz, dein Profil-Showcase, Tier Lists, eigene Challenges, Streaks, Erfolge und Smash-or-Pass-Stimmen. Besucher ohne Konto erhalten eine zufällige Sitzungs-ID, damit ihre Smash-or-Pass-Stimmen gemerkt werden können.",
        "<b>Fehlermeldungen und Nachrichten:</b> Text, Screenshots, Name und E-Mail-Adresse, die du uns schickst. Gäste müssen eine E-Mail-Adresse angeben, damit wir antworten können.",
        "<b>Technische Daten:</b> deine IP-Adresse, Browsertyp und Anfragedetails, genutzt für Ratenbegrenzung, Missbrauchsschutz und Fehlerbehebung.",
        "<b>Sprachbefehle (Karten):</b> Wenn du sie einschaltest, wird dein Mikrofonton zur Erkennung von Kartennamen verwendet. Wie das funktioniert, steht unten im Abschnitt zu Speicher und Dritten.",
      ],
    },
    howWeUse: {
      heading: "Wofür wir sie nutzen",
      paragraphs: ["Wir verwenden personenbezogene Daten nur für die folgenden Zwecke und stützen uns, wo die DSGVO gilt, auf diese Rechtsgrundlagen:"],
      items: [
        "Um dein Konto zu erstellen und zu betreiben, deine gespeicherten Daten zu verwalten und Bestätigungs- und Passwort-Zurücksetzen-E-Mails zu senden (Erfüllung unseres Dienstes dir gegenüber).",
        "Um Fehlermeldungen und Anfragen zu beantworten (unser berechtigtes Interesse an Nutzerunterstützung oder deine Anfrage).",
        "Um die Seite zu sichern, Spam und Missbrauch zu verhindern und Fehler zu beheben (unser berechtigtes Interesse).",
        "Um zu verstehen, welche Seiten genutzt werden, und die Seite zu verbessern, mit datenschutzfreundlicher Analyse (unser berechtigtes Interesse).",
        "Wo wir um deine Einwilligung bitten, etwa für eine Funktion, die sie erfordert, kannst du sie jederzeit widerrufen.",
      ],
    },
    analytics: {
      heading: "Analyse",
      paragraphs: [
        "Wir nutzen <b>Umami</b>, ein Open-Source-Analysetool, das wir selbst hosten. Es verwendet keine Cookies, verfolgt dich nicht über andere Websites und speichert deine IP-Adresse nicht.",
        "Es erfasst anonyme Besuchsdaten wie aufgerufene Seite, Referrer, Browser, Betriebssystem, Gerätetyp, Bildschirmgröße und ungefähres Land.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookies, lokaler Speicher und Dritte",
      paragraphs: [
        "Beim Anmelden setzt LemonDBD ein unbedingt erforderliches Cookie: ein Sitzungs-Cookie, das dich {sessionWindow} lang oder bis zum Abmelden angemeldet hält. Es ist HttpOnly, sodass Skripte auf der Seite es nicht lesen können, und wird nie zum Tracking verwendet. Daneben speichert der lokale Speicher deines Browsers kleine Einträge, die die Seite funktionieren lassen oder deine Auswahl merken, zum Beispiel eine Markierung, dass du angemeldet bist, Zustände von Seitenleiste und Panels, Soundeinstellungen, Entwürfe, gewählte Roster und deine Smash-or-Pass-Sitzungs-ID.",
        "Diese Einträge sind unbedingt erforderlich oder reine Komforteinstellungen, ein Einwilligungsbanner ist daher nicht nötig. Der lokale Speicher bleibt auf deinem Gerät und kann jederzeit im Browser gelöscht werden; beim Abmelden wird das Sitzungs-Cookie gelöscht.",
        "<b>Sprachbefehle:</b> In Chrome, Edge und Safari übernimmt der Browserhersteller (z. B. Google oder Apple) die Spracherkennung, sodass Audio gemäß deren Datenschutzerklärung dorthin gesendet werden kann. In anderen Browsern lädt LemonDBD ein kleines Sprachmodell herunter und verarbeitet Audio ausschließlich auf deinem Gerät.",
      ],
      items: [],
    },
    sharing: {
      heading: "Wer deine Daten sieht",
      paragraphs: ["Wir verkaufen deine personenbezogenen Daten nicht und nutzen sie nicht für Werbung. Wir teilen sie nur, soweit nötig:"],
      items: [
        "<b>Öffentliche Inhalte:</b> Dinge, die du veröffentlichst, etwa öffentliche Tier Lists, Roster und Ranglisten, sind für andere Besucher zusammen mit deinem Benutzernamen und Avatar sichtbar.",
        "<b>Dienstleister:</b> Unser Hosting-Anbieter und {mailProvider} (der unsere Bestätigungs- und Passwort-Zurücksetzen-E-Mails zustellt) verarbeiten Daten in unserem Auftrag, nur um die Seite zu betreiben und die von dir angeforderten E-Mails zu senden.",
        "<b>Discord:</b> Wenn du eine Fehlermeldung einreichst, wird ihr Inhalt (einschließlich Name, E-Mail-Adresse und Screenshots) an einen privaten Kanal unseres Teams weitergeleitet.",
        "<b>Rechtliche Gründe:</b> wenn das Gesetz es verlangt oder um die Seite und ihre Nutzer vor Missbrauch zu schützen.",
      ],
    },
    transfers: {
      heading: "Internationale Übermittlungen",
      paragraphs: [
        "Einige Anbieter, auf die wir uns stützen, können Daten außerhalb deines Landes verarbeiten, auch außerhalb des EWR oder des Vereinigten Königreichs. In diesem Fall stützen wir uns auf Garantien wie Standardvertragsklauseln oder einen Angemessenheitsbeschluss.",
      ],
      items: [],
    },
    retention: {
      heading: "Wie lange wir sie aufbewahren",
      paragraphs: [
        "Kontodaten und gespeicherte Inhalte bleiben, solange dein Konto besteht. Bestätigungscodes verfallen nach {verificationWindow}, Passwort-Zurücksetzen-Links nach {resetWindow} und Anmeldesitzungen nach {sessionWindow}. Streaks, die {streakPrune} inaktiv bleiben, werden automatisch beendet. Fehlermeldungen werden so lange aufbewahrt, wie sie zur Lösung und für unsere Unterlagen nötig sind. Serverprotokolle werden nur kurz gespeichert. Analysedaten sind anonym.",
        "Du kannst dein Konto selbst auf deiner Profilseite löschen oder uns darum bitten. Danach entfernen wir deine Kontodaten, gespeicherten Inhalte und den hochgeladenen Avatar. Deine Fehlermeldungen bleiben für unsere Unterlagen erhalten, aber dein Name und deine E-Mail-Adresse werden daraus entfernt. Kopien, die bereits an unseren privaten Discord-Kanal gesendet oder in Backups gespeichert wurden, können für begrenzte Zeit bestehen bleiben, und öffentlich Veröffentlichtes kann anonymisiert statt entfernt werden.",
      ],
      items: [],
    },
    security: {
      heading: "Sicherheit",
      paragraphs: [
        "Wir schützen deine Daten unter anderem durch verschlüsselte Verbindungen (HTTPS), gehashte Passwörter, Ratenbegrenzung und Spam-Schutz. Kein Online-Dienst ist vollkommen sicher, daher nutze bitte ein starkes, einzigartiges Passwort.",
      ],
      items: [],
    },
    rights: {
      heading: "Deine Rechte",
      paragraphs: [
        "Je nach Wohnort (z. B. im EWR oder im Vereinigten Königreich) hast du das Recht auf:",
      ],
      items: [
        "Auskunft über die von uns gespeicherten personenbezogenen Daten und eine Kopie;",
        "Berichtigung unrichtiger Daten;",
        "Löschung deiner Daten („Recht auf Vergessenwerden“);",
        "Einschränkung der Verarbeitung oder Widerspruch gegen bestimmte Verarbeitungen;",
        "Erhalt deiner Daten in einem übertragbaren Format;",
        "Widerruf der Einwilligung jederzeit, wenn die Verarbeitung auf einer Einwilligung beruht;",
        "Beschwerde bei deiner örtlichen Datenschutzaufsichtsbehörde.",
      ],
    },
    children: {
      heading: "Kinder",
      paragraphs: [
        "LemonDBD richtet sich nicht an Kinder unter 13 Jahren (oder unter 16, wo dein Land ein höheres Einwilligungsalter vorsieht), und wir erheben wissentlich keine Daten von ihnen. Wenn du glaubst, dass ein Kind uns personenbezogene Daten übermittelt hat, melde dich bei uns, und wir löschen sie.",
      ],
      items: [],
    },
    changes: {
      heading: "Änderungen dieser Erklärung",
      paragraphs: [
        "Wir können diese Seite aktualisieren, wenn sich die Seite oder die Rechtslage ändert. Das Datum „Zuletzt aktualisiert“ oben zeigt die neueste Fassung, und wesentliche Änderungen kündigen wir auf der Seite an.",
      ],
      items: [],
    },
    contact: {
      heading: "Kontakt",
      paragraphs: [
        "Um deine Rechte auszuüben, eine Datenschutzfrage zu stellen oder die Löschung deines Kontos zu beantragen, schreibe uns an [{contactEmail}](mailto:{contactEmail}). Angemeldete Nutzer können ihr Konto auch selbst auf der Profilseite löschen. Bitte schreibe von der Adresse, die in deinem Konto hinterlegt ist, damit wir deine Identität prüfen können.",
        "Falls die übersetzten Fassungen dieser Seite von der englischen abweichen, gilt die englische Fassung.",
      ],
      items: [],
    },
  },
};
