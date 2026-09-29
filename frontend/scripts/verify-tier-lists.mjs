// frontend/scripts/verify-tier-lists.mjs
//
// Cross-resolution (and optionally cross-browser) verification for the Tier
// Lists feature: the hub, an official list of every item shape, the creator,
// and a custom list. Run against a live stack (e.g. after
// `docker compose up -d --build`):
//
//   cd frontend
//   npx playwright install chromium          # once (add firefox webkit to test those too)
//   node scripts/verify-tier-lists.mjs
//
// Optional env vars:
//   TIER_LISTS_BASE_URL   (default: https://localhost)
//   TIER_LISTS_LOCALE     (default: en)
//   TIER_LISTS_BROWSERS   (default: chromium; e.g. "chromium,firefox,webkit")
//   TIER_LISTS_VIEWPORTS  (comma-separated names from VIEWPORTS to run a subset)
//   PLAYWRIGHT_CHROMIUM_PATH  (use a preinstalled Chromium binary)
//
// Per viewport it checks, and fails the run on:
//   * no horizontal page overflow on any tier-list page;
//   * the board renders every tier plus the unranked pool, and the pool is on
//     screen without scrolling to the bottom (sticky sheet / side panel);
//   * a move actually happens: mouse drag on pointer devices, tap-to-select +
//     "Move here" on touch devices -- and survives a reload;
//   * the creator builds a list from pasted links and opens it;
//   * no uncaught page errors (React hydration errors included).
// It also reports -- without failing -- interactive controls smaller than
// 40px on touch viewports. Screenshots + report.json land in
// playwright-tier-lists-check/ (root of repo).


import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.TIER_LISTS_BASE_URL || 'https://localhost').replace(/\/+$/, '');
const LOCALE = process.env.TIER_LISTS_LOCALE || 'en';
const OUT_DIR = path.join(__dirname, '..', '..', 'playwright', 'tier-lists-check');
fs.mkdirSync(OUT_DIR, { recursive: true });

export const VIEWPORTS = [
  { name: 'phone-small-320', width: 320, height: 640, touch: true },
  { name: 'phone-android-360', width: 360, height: 800, touch: true },
  { name: 'phone-iphone-se-375', width: 375, height: 667, touch: true },
  { name: 'phone-iphone-14-390', width: 390, height: 844, touch: true },
  { name: 'phone-pro-max-430', width: 430, height: 932, touch: true },
  { name: 'phone-landscape-844', width: 844, height: 390, touch: true },
  { name: 'tablet-ipad-768', width: 768, height: 1024, touch: true },
  { name: 'tablet-ipad-pro-1024', width: 1024, height: 1366, touch: true },
  { name: 'laptop-1280', width: 1280, height: 720, touch: false },
  { name: 'laptop-1366', width: 1366, height: 768, touch: false },
  { name: 'laptop-1440', width: 1440, height: 900, touch: false },
  { name: 'desktop-1920', width: 1920, height: 1080, touch: false },
  { name: 'desktop-2560', width: 2560, height: 1440, touch: false },
  { name: 'desktop-4k-3840', width: 3840, height: 2160, touch: false },
];

const ENGINES = { chromium, firefox, webkit };

const url = (p) => `${BASE_URL}/${LOCALE}${p}`;
const POOL = 'aside[data-tier-pool] [aria-roledescription="sortable"]';

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('main button, main a[href], main input:not([type=hidden]), main textarea')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (Math.min(r.width, r.height) < 40) {
        out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return [...new Set(out)].slice(0, 12);
  });
}

async function waitForBoard(page) {
  await page.waitForSelector('section[aria-label] > button', { timeout: 20000 });
  await page.waitForSelector(POOL, { timeout: 20000 });
  await page.waitForTimeout(250);
}

async function checkViewport(browserName, browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch && vp.width < 1000,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 160)));
  const shot = (name) => page.screenshot({ path: path.join(OUT_DIR, `${browserName}__${vp.name}__${name}.png`) });

  const entry = { browser: browserName, viewport: vp.name, width: vp.width, height: vp.height, checks: {}, notes: {} };
  const check = (name, ok, detail) => {
    entry.checks[name] = ok;
    if (!ok && detail) entry.notes[name] = detail;
  };

  try {
    // Hub
    await page.goto(url('/tier-lists'), { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('main h1', { timeout: 15000 });
    check('hub.noOverflow', await noOverflow(page));
    check('hub.officialCards', (await page.locator('main a[href*="/tier-lists/"]').count()) >= 5);
    await shot('hub');

    // Official lists: square tiles, perks, wide map tiles
    for (const slug of ['survivors', 'killer-perks', 'maps']) {
      await page.goto(url(`/tier-lists/${slug}`), { waitUntil: 'networkidle', timeout: 45000 });
      await waitForBoard(page);
      check(`${slug}.noOverflow`, await noOverflow(page));
      check(`${slug}.sixTiers`, (await page.locator('section[aria-label] > button').count()) >= 6);
      const poolBox = await page.locator('aside[data-tier-pool]').boundingBox();
      check(`${slug}.poolOnScreen`, Boolean(poolBox && poolBox.y < vp.height && poolBox.y + 40 > 0), JSON.stringify(poolBox));
      await shot(slug);
    }

    // A move on the survivors board: drag with a mouse, tap-to-move on touch.
    await page.goto(url('/tier-lists/survivors'), { waitUntil: 'networkidle' });
    await waitForBoard(page);
    await page.evaluate(() => localStorage.removeItem('lemondbd_tier_lists'));
    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoard(page);
    const tile = page.locator(POOL).first();
    const moved = await tile.getAttribute('aria-label');
    if (vp.touch) {
      console.log('before tile.tap, count:', await page.locator(POOL).count());
      await tile.tap();
      console.log('after tile.tap');
      const targetBtn = page.locator('section[aria-label] >> nth=1').getByRole('button', { name: /./ }).last();
      await targetBtn.scrollIntoViewIfNeeded();
      console.log('before targetBtn.tap, exists:', await targetBtn.count());
      await targetBtn.tap();
      console.log('after targetBtn.tap');
    } else {
      const from = await tile.boundingBox();
      const target = await page.locator('section[aria-label] > div').nth(1).boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
      await page.mouse.move(target.x + 40, target.y + target.height / 2, { steps: 18 });
      await page.waitForTimeout(120);
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const inTier = async () =>
      page.locator('section[aria-label] >> nth=1').locator(`[aria-roledescription="sortable"][aria-label="${moved}"]`).count();
    check('move.placed', (await inTier()) === 1, `${moved} not in second tier`);
    await shot('after-move');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForBoard(page);
    check('move.persists', (await inTier()) === 1);

    // Creator -> custom list
    await page.goto(url('/tier-lists/new'), { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.removeItem('lemondbd_tier_list_draft'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('main h1');
    check('creator.noOverflow', await noOverflow(page));
    await page.locator('main input').first().fill(`Responsive check ${vp.name}`);
    await page.getByRole('radio').nth(1).click();
    await page.locator('#tier-creator-links').fill('Alpha | https://example.com/a.png\nBravo\nCharlie | https://example.com/c.png');
    await page.locator('#tier-creator-links').locator('xpath=..').getByRole('button').last().click();
    await page.waitForTimeout(200);
    // Upload: a real PNG goes through decode -> shrink -> data: URL.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );
    await page.getByRole('radio').nth(0).click();
    await page.locator('input[type=file][multiple]').setInputFiles({ name: 'upload_test-image.png', mimeType: 'image/png', buffer: png });
    const uploaded = await page
      .waitForFunction(() => document.querySelectorAll('main ul > li').length >= 4, null, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    check('creator.upload', uploaded);
    check('creator.noOverflowWithItems', await noOverflow(page));
    await shot('creator');
    await page.locator('[data-tier-create]:visible').click();
    await page.waitForURL(/\/tier-lists\/custom\//, { timeout: 15000 });
    await waitForBoard(page);
    check('custom.created', (await page.locator(POOL).count()) === 4);
    check('custom.noOverflow', await noOverflow(page));
    await shot('custom');

    if (vp.touch) entry.smallTargets = await smallTargets(page);
    check('noPageErrors', pageErrors.length === 0, pageErrors.join(' | '));
  } catch (err) {
    entry.error = String(err).split('\n')[0];
    try {
      await shot('error');
    } catch {
      /* ignore */
    }
  } finally {
    await context.close();
  }

  entry.ok = !entry.error && Object.values(entry.checks).every(Boolean);
  return entry;
}

async function main() {
  const engines = (process.env.TIER_LISTS_BROWSERS || 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
  const subset = (process.env.TIER_LISTS_VIEWPORTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const viewports = subset.length ? VIEWPORTS.filter((v) => subset.includes(v.name)) : VIEWPORTS;
  const results = [];

  console.log(`Target: ${BASE_URL}/${LOCALE}/tier-lists\n`);
  for (const name of engines) {
    const launcher = ENGINES[name];
    if (!launcher) continue;
    let browser;
    try {
      const executablePath = name === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_PATH : undefined;
      browser = await launcher.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    } catch (err) {
      console.log(`[${name}] SKIPPED: ${String(err.message).split('\n')[0]}\n  -> npx playwright install ${name}`);
      continue;
    }
    console.log(`=== ${name} ===`);
    for (const vp of viewports) {
      const entry = await checkViewport(name, browser, vp);
      results.push(entry);
      const failed = Object.entries(entry.checks).filter(([, ok]) => !ok).map(([k]) => k);
      console.log(
        `[${entry.ok ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(22)} ${vp.width}x${vp.height}` +
          (failed.length ? `  failed: ${failed.join(', ')}` : '') +
          (entry.error ? `  error: ${entry.error}` : '') +
          (entry.smallTargets?.length ? `  (small targets: ${entry.smallTargets.length})` : '')
      );
    }
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} viewport runs passed. Report + screenshots: ${path.relative(process.cwd(), OUT_DIR)}/`);
  process.exitCode = passed === results.length ? 0 : 1;
}

await main();
