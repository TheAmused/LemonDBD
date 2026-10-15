// frontend/src/locales/en/privacy.ts
export default {
  pageTitle: "LemonDBD - Privacy Policy",
  heading: "Privacy Policy",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "October 15, 2026",
  intro:
    "This page explains what personal data <brand>LemonDBD</brand> collects, why, who sees it and what you can do about it. We kept it short and plain on purpose.",
  translationNotice: "If the translated versions of this page differ from the English one, the English version prevails.",
  summaryHeading: "The short version",
  summary: [
    "We collect only what the site needs to work: an account, the things you save on it and basic technical data.",
    "No ads, no data sales and no cross-site tracking.",
    "Our analytics is self-hosted and cookie-free.",
    "You can ask us to see, fix or delete your data at any time.",
  ],
  sections: {
    whoWeAre: {
      heading: "Who we are",
      paragraphs: [
        "<brand>LemonDBD</brand> is a free, fan-made companion site for <i>Dead by Daylight</i>, run by <brand>LemonTeam</brand>. We are the controller of the personal data described on this page.",
        "<brand>LemonDBD</brand> is unofficial and is not affiliated with or endorsed by Behaviour Interactive Inc. <i>Dead by Daylight</i> and its names, images and other game content belong to their respective owners.",
      ],
      items: [],
    },
    aiContent: {
      heading: "AI-generated content",
      paragraphs: [
        "Some content on <brand>LemonDBD</brand>, such as images and some texts, may be generated, edited or upscaled with AI tools.",
        "Some text related to character lore may include additions that go beyond canon lore, written for humor.",
        "AI-assisted content can contain mistakes or odd details. If you spot something wrong or would like a piece of content reviewed or removed, contact us.",
      ],
      items: [],
    },
    dataWeCollect: {
      heading: "What we collect",
      paragraphs: ["You can use most of the site without an account. Depending on what you do, we process:"],
      items: [
        "<b>Account data:</b> username, email address, a hash of your password (never the password itself), avatar, preferred language, and short-lived verification and password-reset codes.",
        "<b>Two-factor sign-in (optional):</b> only if you turn it on from your profile page. We store the secret key behind your authenticator app (encrypted), hashed one-time recovery codes, when you turned it on, the last code step we accepted (so a code cannot be reused) and a counter of recent wrong codes with a temporary lock time. Your authenticator app generates the codes on your device; no phone number is needed.",
        "<b>What you save:</b> character and perk ownership, your profile showcase, streak runs, challenge achievements, minigame stats and Smash or Pass votes. Your tier lists, Smash or Pass rosters and custom minigames stay in your own browser and are not stored on our servers, except as described under “Reporting content”. Visitors without an account get a random session ID so their Smash or Pass votes can be remembered.",
        "<b>Bug reports and messages:</b> the text, screenshots and email address you send us. Guests must give an email address so we can answer.",
        "<b>Technical data:</b> your IP address, browser type and request details, used for rate limiting, abuse prevention and fixing errors.",
        "<b>Voice commands (maps):</b> if you turn them on, your microphone audio is used to recognize map names. See the section on storage and third parties below for how this works.",
        "<b>Screenshot check:</b> if you upload a match scoreboard to verify a challenge, the image is analysed in the server's memory and discarded as soon as the result is ready. It is never saved or logged; only the result (for example won or not) is returned to you.",
      ],
    },
    howWeUse: {
      heading: "Why we use it",
      paragraphs: ["We use personal data only for the purposes below, and rely on these legal bases where the GDPR applies:"],
      items: [
        "To create and run your account, keep your saved data and send verification and password-reset emails, and, if you turn it on, to check your two-factor code when you sign in (performance of our service to you).",
        "To answer bug reports and requests (our legitimate interest in supporting users, or your request).",
        "To keep the site and accounts secure, including limiting wrong two-factor codes, stop spam and abuse and fix errors (our legitimate interest).",
        "To review reports of content and enforce our Rules (our legitimate interest in keeping the site safe).",
        "To understand which pages are used and to improve the site through privacy-friendly analytics (our legitimate interest).",
        "If we ask for your consent, you can take it back at any time.",
      ],
    },
    moderation: {
      heading: "Reporting content",
      paragraphs: [
        "Tier lists, rosters and custom minigames live in your browser, not on our servers. Two things involve us:",
        "When you delete your account, your username in these records is replaced by “Deleted user” and the notes you wrote as a reporter are erased. These records are part of the data you can download.",
      ],
      items: [
        "<b>Sharing and exporting:</b> we add a tamper-proof account mark to the link or file (it identifies your account and cannot be forged), so that reported content can be traced to its author. To do this our server briefly reads the content, but does not keep it.",
        "<b>Reports:</b> if you report content, we receive your account, the reason, your optional note and a copy of the content. A member of <brand>LemonTeam</brand> reviews it, and the copy is deleted once a decision is made, or after 14 days at the latest.",
        "<b>After a decision:</b> we keep a short record (type of content, reason, outcome, dates, the accounts involved). If content is banned, a one-way code of it goes on a block list so it cannot be opened or imported again; the code cannot be turned back into the content. These records stay as long as we need them to handle complaints and prevent repeat abuse. The author, if known, gets the reason by email; we do not name the reporter.",
      ],
    },
    analytics: {
      heading: "Analytics",
      paragraphs: [
        "We use <b>Umami</b>, an open-source analytics tool that we host ourselves. It does not use cookies, does not follow you across other websites and does not store your IP address.",
        "It records anonymous visit data such as the page viewed, referrer, browser, operating system, device type, screen size, approximate country and clicks on selected page elements. Analytics data is anonymous.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookies, local storage and third parties",
      paragraphs: [
        "When you sign in, <brand>LemonDBD</brand> sets one strictly necessary cookie: a session cookie that keeps you signed in for {sessionWindow} or until you log out. It is HttpOnly, so scripts running on the page cannot read it, and it is never used for tracking. Besides it, your browser's local storage keeps small items that make the site work or remember your choices, for example a marker that you are signed in, sidebar and panel states, sound settings, drafts, selected rosters and your Smash or Pass session ID.",
        "These items are strictly necessary or purely convenience settings, so no consent banner is needed. Local storage stays on your device and you can clear it in your browser at any time; logging out deletes the session cookie.",
        "<b>Voice commands:</b> in Chrome, Edge and Safari, speech recognition is provided by your browser vendor (for example Google or Apple), so audio may be sent to them under their own privacy policies. In other browsers, <brand>LemonDBD</brand> downloads a small speech model and processes audio only on your device.",
      ],
      items: [],
    },
    sharing: {
      heading: "Who sees your data",
      paragraphs: ["We do not sell your personal data or use it for advertising. We share it only as needed:"],
      items: [
        "<b>Links you share:</b> when you share a tier list, roster or custom minigame, it is packed into the link itself (the part after the “#”, which your browser never sends to us). We do not store it; only people who receive the link can open it. Your account mark is added to it (see “Reporting content”).",
        "<b>Service providers:</b> our hosting provider and {mailProvider} (which delivers our verification and password-reset emails) handle data on our behalf, only to run the site and send you the emails you request, including notices when a security setting on your account changes or when we block your content. Two-factor codes are produced by your own authenticator app and checked on our server; we do not use a third-party service for them, and nothing about them is sent to Google, Microsoft, Apple or anyone else.",
        "<b>Discord:</b> when you submit a bug report, its content (including your email address and screenshots) is forwarded to a private channel used by our team.",
        "<b>Legal reasons:</b> if the law requires it or to protect the site and its users from abuse.",
      ],
    },
    transfers: {
      heading: "International transfers",
      paragraphs: [
        "Some providers we rely on may process data outside your country, including outside the EEA or UK. In that case we rely on safeguards such as Standard Contractual Clauses or an adequacy decision.",
      ],
      items: [],
    },
    retention: {
      heading: "How long we keep it",
      paragraphs: [
        "Account data and what you save are kept while your account exists. Verification codes expire after {verificationWindow}, password-reset links after {resetWindow} and login sessions after {sessionWindow}. Streak runs that stay inactive for {streakPrune} are ended automatically. Bug reports are kept for as long as they are needed to resolve the issue and for our records. Server logs are kept only briefly. A two-factor sign-in step expires after 5 minutes, and a temporary lock after repeated wrong codes lasts 15 minutes.",
        "You can delete your account yourself from your profile page, or ask us to do it. Your account data, character and perk ownership, showcase, streak runs, minigame stats, challenge achievements uploaded avatar and any two-factor setup and recovery codes are then removed. Turning two-factor sign-in off removes them as well. Smash or Pass votes stay as anonymous entries that are no longer tied to you. Your bug reports are kept for our records, but your email address is removed from them. Copies already sent to our private Discord channel may remain.",
      ],
      items: [],
    },
    security: {
      heading: "Security",
      paragraphs: [
        "We protect your data with measures such as encrypted connections (HTTPS), hashed passwords, rate limiting, spam protection and optional two-factor sign-in (the secret behind it is stored encrypted and recovery codes are stored hashed). Changing or resetting your password signs your other devices out. No online service is perfectly secure, so please use a strong, unique password.",
      ],
      items: [],
    },
    rights: {
      heading: "Your rights",
      paragraphs: [
        "Depending on where you live (for example in the EEA or UK), you have the right to:",
        "On your profile page you can update your profile details, turn two-factor sign-in on or off, download a copy of your data and delete your account yourself. To use any other right, email [{contactEmail}](mailto:{contactEmail}); we answer within one month.",
      ],
      items: [
        "access the personal data we hold about you and get a copy;",
        "correct inaccurate data;",
        "ask us to delete your data (the \"right to be forgotten\");",
        "restrict or object to certain processing;",
        "receive your data in a portable format;",
        "withdraw consent at any time, where processing is based on consent;",
        "lodge a complaint with your local data protection authority.",
      ],
    },
    children: {
      heading: "Children",
      paragraphs: [
        "<brand>LemonDBD</brand> is not directed at children under 13 (or under 16 where your country sets a higher age for consent), and we do not knowingly collect their data. If you believe a child has given us personal data, contact us and we will delete it.",
      ],
      items: [],
    },
    changes: {
      heading: "Changes to this policy",
      paragraphs: [
        "We may update this page when the site or the law changes. The \"Last updated\" date at the top shows the latest version, and we will announce significant changes on the site.",
      ],
      items: [],
    },
    contact: {
      heading: "Contact us",
      paragraphs: [
        "To use any of your rights, ask a privacy question or request account deletion, email us at [{contactEmail}](mailto:{contactEmail}). Signed-in users can also delete their account themselves from their profile page. Please write from the address registered on your account so we can verify who you are. If you lose both your authenticator app and your recovery codes, we can switch two-factor off for your account once we have verified you.",
      ],
      items: [],
    },
  },
};
