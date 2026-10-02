// frontend/src/locales/en/privacy.ts
export default {
  pageTitle: "LemonDBD - Privacy Policy",
  heading: "Privacy Policy",
  backToAbout: "Back to About us",
  lastUpdatedLabel: "Last updated",
  lastUpdated: "October 1, 2026",
  intro:
    "This page explains what personal data <brand>LemonDBD</brand> collects, why, who sees it and what you can do about it. We kept it short and plain on purpose.",
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
    dataWeCollect: {
      heading: "What we collect",
      paragraphs: ["You can use most of the site without an account. Depending on what you do, we process:"],
      items: [
        "<b>Account data:</b> username, email address, a hash of your password (never the password itself), avatar, preferred language, and short-lived verification and password-reset codes.",
        "<b>What you save:</b> character and perk ownership, your profile showcase, streak runs, challenge achievements, minigame stats and Smash or Pass votes. Your tier lists, Smash or Pass rosters and custom minigames stay in your own browser and are not sent to our servers. Visitors without an account get a random session ID so their Smash or Pass votes can be remembered.",
        "<b>Bug reports and messages:</b> the text, screenshots, name and email address you send us. Guests must give an email address so we can answer.",
        "<b>Technical data:</b> your IP address, browser type and request details, used for rate limiting, abuse prevention and fixing errors.",
        "<b>Voice commands (maps):</b> if you turn them on, your microphone audio is used to recognize map names. See the section on storage and third parties below for how this works.",
        "<b>Screenshot check:</b> if you upload a match scoreboard to verify a challenge, the image is analysed in the server's memory and discarded as soon as the result is ready. It is never saved or logged; only the result (for example won or not) is returned to you.",
      ],
    },
    howWeUse: {
      heading: "Why we use it",
      paragraphs: ["We use personal data only for the purposes below, and rely on these legal bases where the GDPR applies:"],
      items: [
        "To create and run your account, keep your saved data and send verification and password-reset emails (performance of our service to you).",
        "To answer bug reports and requests (our legitimate interest in supporting users, or your request).",
        "To keep the site secure, stop spam and abuse and fix errors (our legitimate interest).",
        "To understand which pages are used and improve the site, using privacy-friendly analytics (our legitimate interest).",
        "Where we ask for your consent, for example to enable a feature that needs it, you can withdraw it at any time.",
      ],
    },
    analytics: {
      heading: "Analytics",
      paragraphs: [
        "We use <b>Umami</b>, an open-source analytics tool that we host ourselves. It does not use cookies, does not follow you across other websites and does not store your IP address.",
        "It records anonymous visit data such as the page viewed, referrer, browser, operating system, device type, screen size and approximate country.",
      ],
      items: [],
    },
    storage: {
      heading: "Cookies, local storage and third parties",
      paragraphs: [
        "When you sign in, LemonDBD sets one strictly necessary cookie: a session cookie that keeps you signed in for {sessionWindow} or until you log out. It is HttpOnly, so scripts running on the page cannot read it, and it is never used for tracking. Besides it, your browser's local storage keeps small items that make the site work or remember your choices, for example a marker that you are signed in, sidebar and panel states, sound settings, drafts, selected rosters and your Smash or Pass session ID.",
        "These items are strictly necessary or purely convenience settings, so no consent banner is needed. Local storage stays on your device and you can clear it in your browser at any time; logging out deletes the session cookie.",
        "<b>Voice commands:</b> in Chrome, Edge and Safari, speech recognition is provided by your browser vendor (for example Google or Apple), so audio may be sent to them under their own privacy policies. In other browsers, LemonDBD downloads a small speech model and processes audio only on your device.",
      ],
      items: [],
    },
    sharing: {
      heading: "Who sees your data",
      paragraphs: ["We do not sell your personal data or use it for advertising. We share it only as needed:"],
      items: [
        "<b>Links you share:</b> when you share a tier list, roster or custom minigame, it is packed into the link itself (the part after the “#”, which your browser never sends to us). We do not store it and cannot see it; only people who receive the link can open it.",
        "<b>Service providers:</b> our hosting provider and {mailProvider} (which delivers our verification and password-reset emails) handle data on our behalf, only to run the site and send you the emails you request.",
        "<b>Discord:</b> when you submit a bug report, its content (including your name, email address and screenshots) is forwarded to a private channel used by our team.",
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
        "Account data and what you save are kept while your account exists. Verification codes expire after {verificationWindow}, password-reset links after {resetWindow} and login sessions after {sessionWindow}. Streak runs that stay inactive for {streakPrune} are ended automatically. Bug reports are kept for as long as they are needed to resolve the issue and for our records. Server logs are kept only briefly. Analytics data is anonymous.",
        "You can delete your account yourself from your profile page, or ask us to do it. Your account data, character and perk ownership, showcase, streak runs, minigame stats, challenge achievements and uploaded avatar are then removed. Smash or Pass votes stay as anonymous entries that are no longer tied to you. Your bug reports are kept for our records, but your name and email address are removed from them. Copies already sent to our private Discord channel may remain.",
      ],
      items: [],
    },
    security: {
      heading: "Security",
      paragraphs: [
        "We protect your data with measures such as encrypted connections (HTTPS), hashed passwords, rate limiting and spam protection. No online service is perfectly secure, so please use a strong, unique password.",
      ],
      items: [],
    },
    rights: {
      heading: "Your rights",
      paragraphs: [
        "Depending on where you live (for example in the EEA or UK), you have the right to:",
        "On your profile page you can update your profile details, download a copy of your data and delete your account yourself. To use any other right, email [{contactEmail}](mailto:{contactEmail}); we answer within one month.",
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
        "LemonDBD is not directed at children under 13 (or under 16 where your country sets a higher age for consent), and we do not knowingly collect their data. If you believe a child has given us personal data, contact us and we will delete it.",
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
        "To use any of your rights, ask a privacy question or request account deletion, email us at [{contactEmail}](mailto:{contactEmail}). Signed-in users can also delete their account themselves from their profile page. Please write from the address registered on your account so we can verify who you are.",
        "If the translated versions of this page differ from the English one, the English version prevails.",
      ],
      items: [],
    },
  },
};
