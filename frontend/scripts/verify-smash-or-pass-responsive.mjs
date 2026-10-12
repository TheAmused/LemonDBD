// frontend/scripts/verify-smash-or-pass-responsive.mjs
//
// Cross-viewport layout verification for Smash or Pass: the play page and the roster creator.
// Run against a live stack:
//
//   cd frontend
//   npx playwright install chromium          # once
//   node scripts/verify-smash-or-pass-responsive.mjs
//
// Optional env vars:
//   SMASH_BASE_URL       (default: https://localhost)
//   SMASH_LOCALE         (default: en)
//   SMASH_BROWSERS       (default: chromium; e.g. "chromium,firefox,webkit")
//   SMASH_VIEWPORTS      (comma-separated names from VIEWPORTS to run a subset)
//   SMASH_REPORT_ONLY=1  (always exit 0 -- use it to record a baseline before the fixes land)
//   PLAYWRIGHT_CHROMIUM_PATH
//
// Per viewport it checks:
//   play.noHScroll          no horizontal page overflow
//   play.headerInViewport   every header button lies inside the viewport
//   play.cardOnScreen       the top card AND its pass/smash buttons are fully visible without scrolling
//   play.loreClearOfCard    no lore block overlaps the card or another lore block
//   play.loreCompact        when the free width beside the card is narrow, the lore blocks carry no
//                           visible label row or icon (labels stay in the accessibility tree)
//   play.noGenericSparkles  no lucide "sparkles" glyph inside the hub header, the lore blocks or the card
//   back.noSoon             the flipped card shows no "Soon..." badge and its text is not blurred
//   back.labelsFilled       every label on the flipped card has text (no blank Turn On / Dealbreaker label)
//   back.queueHidden        no queued card is visible behind the flipped card
//   back.queueHiddenWhileTurning(Back)  ...and none shows through while the card turns (edge-on)
//   back.noLabelIcons       the labels on the flipped card carry no icon
//   back.shortByDefault     the flipped card shows at most ~560 characters before "Show more"
//   play.noLabelIcons       the lore blocks' labels carry no icon
//   create.noHScroll        no horizontal page overflow
//   create.submitCentered   the Create button is centred under the form column (+-2px)
//   create.submitLast       the Create button sits below every form section and the feedback area
//   create.singleSubmit     exactly one visible Create button
// It also reports (without failing) interactive controls smaller than 40px on touch viewports.
// Screenshots + report.json land in playwright/smash-or-pass-responsive/ (root of repo).
//
// Hooks the selectors look for (the first match wins, the second is today's markup):
//   top card    [data-smash-card="top"]      | main [class*="cursor-grab"]
//   lore block  [data-lore-card]             | .anim-lore-dissolve > div
//   hub header  [data-hub-header]            | header.rounded-3xl
//   create btn  [data-roster-create]

import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.SMASH_BASE_URL || 'https://localhost').replace(/\/+$/, '');
const LOCALE = process.env.SMASH_LOCALE || 'en';
const OUT_DIR = path.join(__dirname, '..', '..', 'playwright', 'smash-or-pass-responsive');
fs.mkdirSync(OUT_DIR, { recursive: true });

export const VIEWPORTS = [
  { name: 'phone-small-320', width: 320, height: 568, touch: true },
  { name: 'phone-android-360', width: 360, height: 740, touch: true },
  { name: 'phone-iphone-se-375', width: 375, height: 667, touch: true },
  { name: 'phone-iphone-14-390', width: 390, height: 844, touch: true },
  { name: 'phone-pro-max-430', width: 430, height: 932, touch: true },
  { name: 'phone-landscape-844', width: 844, height: 390, touch: true },
  { name: 'tablet-ipad-768', width: 768, height: 1024, touch: true },
  { name: 'tablet-ipad-air-820', width: 820, height: 1180, touch: true },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, touch: true },
  { name: 'laptop-1280x720', width: 1280, height: 720, touch: false },
  { name: 'laptop-1366x768', width: 1366, height: 768, touch: false },
  { name: 'laptop-1440x900', width: 1440, height: 900, touch: false },
  { name: 'desktop-1920x1080', width: 1920, height: 1080, touch: false },
  { name: 'desktop-2560x1440', width: 2560, height: 1440, touch: false },
];

/** The back of the card must stay a glance: this many characters at most before "Show more". */
const BACK_MAX_CHARS = Number(process.env.SMASH_BACK_MAX_CHARS || 560);

const ENGINES = { chromium, firefox, webkit };
const url = (p) => `${BASE_URL}/${LOCALE}${p}`;

const SEL = {
  card: '[data-smash-card="top"], main [class*="cursor-grab"]',
  lore: '[data-lore-card], .anim-lore-dissolve > div',
  header: '[data-hub-header], header.rounded-3xl',
  create: '[data-roster-create]',
};

// The effects dialog opens by itself on a first visit; record a choice so it never covers the page.
const PREFS_INIT = () => {
  try {
    localStorage.setItem('lemondbd_smash_prefs_v1', JSON.stringify({ effects: true, sounds: false, music: false, chosenAt: Date.now() }));
  } catch {}
};

// lucide's Sparkles starts with this path; a custom icon must not.
const SPARKLES_D = 'M11.017 2.814a1 1 0 0 1 1.966 0';

async function measurePlay(page) {
  return page.evaluate(({ SEL, SPARKLES_D }) => {
    const vw = innerWidth;
    const vh = innerHeight;
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    };
    const visible = (el) => {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const hit = (a, b) => !(a.r <= b.x + 1 || a.x >= b.r - 1 || a.b <= b.y + 1 || a.y >= b.b - 1);

    const header = document.querySelector(SEL.header);
    const cardEl = document.querySelector(SEL.card);
    const card = cardEl ? rect(cardEl) : null;
    const voteBtns = cardEl ? [...cardEl.querySelectorAll('button')].filter(visible).map(rect) : [];
    const loreEls = document.querySelectorAll('[data-lore-card]').length ? document.querySelectorAll('[data-lore-card]') : document.querySelectorAll(SEL.lore);
    const lore = [...loreEls].filter(visible).map((el) => ({
      rect: rect(el),
      label: el.querySelector('[data-lore-label]') || el.querySelector('.type-label-2xs'),
      icon: el.querySelector('[data-lore-label] svg') || el.querySelector('svg'),
    }));
    const headerBtns = header ? [...header.querySelectorAll('button')].filter(visible).map(rect) : [];

    const loreOverlaps = [];
    lore.forEach((l, i) => {
      if (card && hit(l.rect, card)) loreOverlaps.push(`lore#${i} x card`);
      lore.slice(i + 1).forEach((m, j) => {
        if (hit(l.rect, m.rect)) loreOverlaps.push(`lore#${i} x lore#${i + 1 + j}`);
      });
    });

    // Free width beside the card is measured inside the hub (the sidebar is not room the lore can use).
    const stageEl = document.querySelector('.smash-stage') || document.querySelector('main');
    const stage = stageEl ? rect(stageEl) : { x: 0, r: vw };
    const freeBesideCard = card ? Math.round(Math.min(card.x - stage.x, stage.r - card.r)) : 0;
    // A screen-reader-only element is a 1px box: it does not count as shown.
    const shown = (el) => visible(el) && el.getBoundingClientRect().width > 4 && el.getBoundingClientRect().height > 4;
    const labelIconCount = [...loreEls].reduce((n, el) => n + el.querySelectorAll('[data-lore-label] svg').length, 0);
    const labelShown = lore.some((l) => l.label && shown(l.label));
    const iconShown = lore.some((l) => l.icon && shown(l.icon));

    const scope = [header, cardEl, ...loreEls].filter(Boolean);
    const sparkles = scope.reduce(
      (n, root) => n + [...root.querySelectorAll('svg path')].filter((p) => (p.getAttribute('d') || '').startsWith(SPARKLES_D)).length,
      0,
    );

    return {
      hscroll: document.documentElement.scrollWidth > vw + 1,
      headerClipped: headerBtns.filter((b) => b.r > vw + 1 || b.x < -1).length,
      headerBtnCount: headerBtns.length,
      card,
      cardBelowFold: card ? Math.max(0, Math.round(card.b - vh)) : null,
      voteBelowFold: voteBtns.length ? Math.max(0, Math.round(Math.max(...voteBtns.map((b) => b.b)) - vh)) : null,
      loreCount: lore.length,
      labelIconCount,
      loreOverlaps,
      freeBesideCard: Math.round(freeBesideCard),
      labelShown,
      iconShown,
      sparkles,
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    };
  }, { SEL, SPARKLES_D });
}

/** Clicks `button` and, frame by frame, records the highest opacity any queued card has in the 160ms after the click
 * (the card is mid-turn then, and edge-on at ~190ms, so nothing behind it may show). */
async function flipAndSample(page, button) {
  await page.evaluate(() => {
    window.__flipLog = null;
    document.addEventListener('click', () => {
      const t0 = performance.now();
      const frames = [];
      const tick = () => {
        const t = performance.now() - t0;
        frames.push([t, Math.max(0, ...[...document.querySelectorAll('.smash-queued')].map((el) => parseFloat(getComputedStyle(el).opacity)))]);
        if (t < 400) requestAnimationFrame(tick); else window.__flipLog = frames;
      };
      requestAnimationFrame(tick);
    }, { capture: true, once: true });
  });
  await button.click({ timeout: 4000 });
  await page.waitForFunction(() => window.__flipLog, null, { timeout: 4000 });
  const frames = await page.evaluate(() => window.__flipLog);
  // The first frame after the click may still be the one the click handler's state update has not reached.
  return Math.max(0, ...frames.filter(([t]) => t > 20 && t < 160).map(([, o]) => o));
}

async function measureBack(page) {
  return page.evaluate(({ SEL }) => {
    const card = document.querySelector(SEL.card);
    const text = card ? card.textContent || '' : '';
    const blurred = card ? [...card.querySelectorAll('*')].some((el) => /blur\(/.test(getComputedStyle(el).filter)) : false;
    const emptyLabels = card ? [...card.querySelectorAll('.type-label-2xs')].filter((el) => !(el.textContent || '').trim()).length : 0;
    // The scrolling body of the back: its rendered text (a collapsed "Show more" is not rendered).
    const body = card ? card.querySelector('.overflow-y-auto') : null;
    const bodyChars = body ? (body.innerText || '').trim().length : 0;
    const bodyOverflow = body ? body.scrollHeight - body.clientHeight : 0;
    const queuedVisible = [...document.querySelectorAll('.smash-queued')].filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.01).length;
    const labelIcons = card ? card.querySelectorAll('.type-label-2xs svg').length : 0;
    return { hasSoon: /\bSoon\.\.\.|Wkrótce\.\.\.|Bald\.\.\.|Próximamente\.\.\./.test(text), blurred, emptyLabels, bodyChars, bodyOverflow, queuedVisible, labelIcons };
  }, { SEL });
}

async function measureCreate(page) {
  return page.evaluate(({ SEL }) => {
    const vw = innerWidth;
    const buttons = [...document.querySelectorAll(SEL.create)].filter((el) => el.getBoundingClientRect().width > 0);
    const btn = buttons[0]?.getBoundingClientRect();
    const root = document.querySelector('h1.sr-only')?.parentElement;
    const sections = root ? [...root.children].filter((el) => el.tagName !== 'H1' && el.getBoundingClientRect().height > 0 && !el.contains(buttons[0]) && getComputedStyle(el).position !== 'fixed') : [];
    const formCol = sections.map((el) => el.getBoundingClientRect()).sort((a, b) => b.width - a.width)[0];
    const lastBottom = sections.length ? Math.max(...sections.map((el) => el.getBoundingClientRect().bottom)) : 0;
    return {
      hscroll: document.documentElement.scrollWidth > vw + 1,
      buttonCount: buttons.length,
      buttonCenterX: btn ? Math.round(btn.x + btn.width / 2) : null,
      columnCenterX: formCol ? Math.round(formCol.x + formCol.width / 2) : null,
      buttonTop: btn ? Math.round(btn.top + scrollY) : null,
      lastSectionBottom: Math.round(lastBottom + scrollY),
    };
  }, { SEL });
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('main button, main a[href], main input:not([type=hidden]):not([type=checkbox]), main textarea')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (Math.min(r.width, r.height) < 40) {
        out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return [...new Set(out)].slice(0, 12);
  });
}

async function checkViewport(browserName, browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch && vp.width < 1000,
    ignoreHTTPSErrors: true,
  });
  await context.addInitScript(PREFS_INIT);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 160)));
  const shot = (name) => page.screenshot({ path: path.join(OUT_DIR, `${browserName}__${vp.name}__${name}.png`), fullPage: name.startsWith('create') });

  const entry = { browser: browserName, viewport: vp.name, width: vp.width, height: vp.height, checks: {}, notes: {} };
  const check = (name, ok, detail) => {
    entry.checks[name] = ok;
    if (!ok && detail !== undefined) entry.notes[name] = detail;
  };

  try {
    // ---- Play page
    await page.goto(url('/smash-or-pass'), { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector(SEL.card, { timeout: 20000 });
    await page.waitForTimeout(600);
    const p = await measurePlay(page);
    check('play.noHScroll', !p.hscroll);
    check('play.headerInViewport', p.headerClipped === 0, `${p.headerClipped}/${p.headerBtnCount} header buttons outside the viewport`);
    // A window too short for the 400px card floor scrolls instead: that is the design, so it is a note, not a failure.
    const atFloor = p.card && p.card.h <= 400.5;
    check(
      'play.cardOnScreen',
      (p.cardBelowFold === 0 && p.voteBelowFold === 0) || atFloor,
      `card ${p.cardBelowFold}px / vote buttons ${p.voteBelowFold}px below the fold`
    );
    if (atFloor && (p.cardBelowFold > 0 || p.voteBelowFold > 0)) {
      entry.notes.cardScrolls = `window too short for the 400px card floor: the page scrolls (${p.cardBelowFold}px)`;
    }
    check('play.loreClearOfCard', p.loreOverlaps.length === 0, p.loreOverlaps.join('; '));
    // Compact rule: when the free strip beside the card is under 300px, no label row and no icon.
    if (p.loreCount > 0 && p.freeBesideCard < 300) {
      check('play.loreCompact', !p.labelShown && !p.iconShown, `free ${p.freeBesideCard}px, label shown: ${p.labelShown}, icon shown: ${p.iconShown}`);
    }
    check('play.noLabelIcons', !p.labelIconCount, `${p.labelIconCount} icon(s) inside the lore labels`);
    check('play.noGenericSparkles', p.sparkles === 0, `${p.sparkles} lucide sparkles glyph(s)`);
    entry.notes.playMetrics = p;
    if (vp.touch) entry.notes.playSmallTargets = await smallTargets(page);
    await shot('play');

    // ---- Card back: flip the top card (its first button is the flip button) and inspect the flags
    try {
      const turnMax = await flipAndSample(page, page.locator(SEL.card).first().locator('button').first());
      check('back.queueHiddenWhileTurning', turnMax === 0, `a queued card was visible (opacity ${turnMax}) in the first 160ms of the turn`);
      // (the turn itself is checked frame by frame by `flipAndSample` below)
      await page.waitForTimeout(600);
      const b = await measureBack(page);
      check('back.noSoon', !b.hasSoon && !b.blurred, `soon badge: ${b.hasSoon}, blurred: ${b.blurred}`);
      check('back.labelsFilled', b.emptyLabels === 0, `${b.emptyLabels} empty label(s)`);
      check('back.queueHidden', b.queuedVisible === 0, `${b.queuedVisible} queued card(s) still visible behind the flipped card`);
      check('back.noLabelIcons', b.labelIcons === 0, `${b.labelIcons} icon(s) on the back-face labels`);
      check('back.shortByDefault', b.bodyChars <= BACK_MAX_CHARS, `${b.bodyChars} characters of text before "Show more" (limit ${BACK_MAX_CHARS})`);
      entry.notes.backMetrics = b;
      await shot('back');
      // Turning back: still hidden during the turn, visible again once the card is face up.
      const backMax = await flipAndSample(page, page.locator(SEL.card).first().locator('button:visible').first());
      check('back.queueHiddenWhileTurningBack', backMax === 0, `a queued card was visible (opacity ${backMax}) in the first 160ms of turning back`);
      await page.waitForTimeout(900);
      const after = await measureBack(page);
      check('back.queueReturnsFaceUp', after.queuedVisible > 0 || (await page.locator('.smash-queued').count()) === 0, 'queued cards did not come back after the card was face up again');
    } catch (err) {
      check('back.ran', false, String(err.message || err).slice(0, 200));
    }

    // ---- Create page
    await page.goto(url('/smash-or-pass/create'), { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector(SEL.create, { state: 'attached', timeout: 20000 });
    await page.waitForTimeout(400);
    const c = await measureCreate(page);
    check('create.noHScroll', !c.hscroll);
    check('create.singleSubmit', c.buttonCount === 1, `${c.buttonCount} visible Create buttons`);
    check('create.submitCentered', c.buttonCenterX !== null && Math.abs(c.buttonCenterX - c.columnCenterX) <= 2, `button centre ${c.buttonCenterX}, column centre ${c.columnCenterX}`);
    check('create.submitLast', c.buttonTop !== null && c.buttonTop >= c.lastSectionBottom - 1, `button top ${c.buttonTop}, last section bottom ${c.lastSectionBottom}`);
    entry.notes.createMetrics = c;
    if (vp.touch) entry.notes.createSmallTargets = await smallTargets(page);
    await shot('create');

    check('noPageErrors', pageErrors.length === 0, pageErrors.slice(0, 3));
  } catch (err) {
    check('ran', false, String(err.message || err).slice(0, 300));
  } finally {
    await context.close();
  }
  return entry;
}

async function main() {
  const wanted = (process.env.SMASH_VIEWPORTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const viewports = wanted.length ? VIEWPORTS.filter((v) => wanted.includes(v.name)) : VIEWPORTS;
  const browserNames = (process.env.SMASH_BROWSERS || 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
  const report = [];
  let failed = 0;

  for (const name of browserNames) {
    const engine = ENGINES[name];
    if (!engine) throw new Error(`unknown browser "${name}"`);
    const browser = await engine.launch({
      headless: true,
      ...(name === 'chromium' && process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
    });
    for (const vp of viewports) {
      const entry = await checkViewport(name, browser, vp);
      const bad = Object.entries(entry.checks).filter(([, ok]) => !ok).map(([k]) => k);
      failed += bad.length;
      console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name.padEnd(8)} ${vp.name.padEnd(24)} ${bad.join(', ')}`);
      report.push(entry);
    }
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${failed} failed check(s). Report + screenshots: ${OUT_DIR}`);
  if (failed && !process.env.SMASH_REPORT_ONLY) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
