// Playwright check: the tier board fits every viewport with no scroll box of its own.
// Usage: node verify-fit.mjs [--shots dir] [--only name] ; env TIER_LISTS_BASE_URL, PW_MODULE_ROOT
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire((process.env.PW_MODULE_ROOT ?? process.cwd()) + '/package.json');
const { chromium } = require('playwright');

const BASE = process.env.TIER_LISTS_BASE_URL ?? 'http://localhost:3111';
const args = process.argv.slice(2);
const argOf = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const shotsDir = argOf('--shots');
const only = argOf('--only');
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

// [width, height, label]
const VIEWPORTS = [
  [420, 900, 'phone-portrait'], [420, 480, 'tiny'], [480, 854, 'phone-large'], [600, 960, 'phablet'],
  [768, 1024, 'tablet-portrait'], [820, 1180, 'tablet-air'], [854, 480, 'phone-landscape'],
  [915, 480, 'phone-landscape-xl'], [1024, 600, 'tablet-landscape-small'], [1024, 768, 'tablet-landscape'],
  [1180, 820, 'tablet-air-landscape'], [1280, 720, 'hd'], [1366, 768, 'laptop'], [1440, 900, 'laptop-large'],
  [1536, 864, 'laptop-hidpi'], [1680, 1050, 'wsxga'], [1920, 1080, 'fhd'], [2048, 1152, 'qhd-lite'],
  [2560, 1080, 'ultrawide'], [2560, 1440, 'qhd'], [1280, 1440, 'tall-narrow'], [2560, 480, 'ultrawide-short'],
];

const TOKENS = ['s', 'a', 'b', 'c', 'd', 'f'];
const LABELS = ['S', 'A', 'B', 'C', 'D', 'F'];
const svg = (i) => {
  const hue = (i * 47) % 360;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(${hue},55%,40%)"/><text x="48" y="60" font-size="34" text-anchor="middle" fill="white" font-family="sans-serif">${i}</text></svg>`);
};

/** total items, how many sit in the pool; the rest spread over the 6 tiers, front-loaded. */
const SCENARIOS = [
  { name: 'empty-pool-40', total: 40, pool: 40, names: 'on' },
  { name: 'pool-321', total: 321, pool: 321, names: 'off' },
  { name: 'balanced-60', total: 60, pool: 12, names: 'on' },
  { name: 'ranked-all-24', total: 24, pool: 0, names: 'on' },
  { name: 'heavy-150', total: 150, pool: 20, names: 'off' },
  { name: 'heavy-150-names', total: 150, pool: 20, names: 'on' },
  { name: 'stress-400', total: 400, pool: 40, names: 'off' },
];

function buildList(sc) {
  const items = Array.from({ length: sc.total }, (_, i) => ({ id: `i${i}`, name: `Item number ${i} with a long name`, image: svg(i) }));
  const placements = Object.fromEntries(TOKENS.map((t) => [t, []]));
  const ranked = items.slice(0, sc.total - sc.pool);
  // uneven spread: S small, middle tiers big
  const weights = [1, 2, 3, 3, 2, 1];
  const wsum = weights.reduce((a, b) => a + b, 0);
  let k = 0;
  TOKENS.forEach((t, ti) => {
    const take = ti === TOKENS.length - 1 ? ranked.length - k : Math.round((ranked.length * weights[ti]) / wsum);
    placements[t] = ranked.slice(k, k + take).map((x) => x.id);
    k += take;
  });
  return {
    id: 'fit-test', title: 'Fit test', description: 'A list used to check the layout.',
    tiers: TOKENS.map((t, i) => ({ id: t, label: LABELS[i], color: t })),
    items, placements, createdAt: 1, updatedAt: 1,
  };
}

const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox'] });
const results = [];
for (const sc of SCENARIOS) {
  if (only && sc.name !== only) continue;
  const list = buildList(sc);
  const state = { version: 1, rankings: {}, custom: { [list.id]: list } };
  for (const [w, h, label] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', hasTouch: w < 1000 });
    await ctx.addInitScript(([s, names]) => {
      localStorage.setItem('lemondbd_tier_lists', JSON.stringify(s));
      localStorage.setItem('lemondbd_tier_lists_names_custom', names);
      localStorage.setItem('lemondbd_cookie_consent', 'true');
    }, [state, sc.names]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE}/en/tier-lists/custom/${list.id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    let ok = true; let info = {};
    try {
      await page.waitForSelector('[data-fit]', { timeout: 60000 });
      await page.waitForTimeout(700);
      info = await page.evaluate(() => {
        const wrap = document.querySelector('[data-fit]');
        const rowsBox = wrap.firstElementChild;
        const pool = document.querySelector('aside[data-tier-pool]');
        const rows = [...document.querySelectorAll('section[aria-label^="Tier"]')];
        const poolBody = pool.querySelector('div.overflow-y-auto');
        const r = (el) => el.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const cs = getComputedStyle(wrap);
        const rowsOutside = rows.filter((el) => r(el).bottom > vh + 0.5 || r(el).top < -0.5 || r(el).right > vw + 0.5).length;
        const tiles = [...document.querySelectorAll('[data-fit] [aria-pressed]')];
        const tilesInRows = rows.flatMap((s) => [...s.querySelectorAll('[aria-pressed]')]);
        const clippedInRows = tilesInRows.filter((el) => { const sr = r(el.closest('section')); const er = r(el); return er.bottom > sr.bottom + 1 || er.right > sr.right + 1; }).length;
        return {
          tile: cs.getPropertyValue('--tile').trim(),
          docScrollY: document.documentElement.scrollHeight - vh,
          docScrollX: document.documentElement.scrollWidth - vw,
          fallback: getComputedStyle(rowsBox).overflowY === 'auto',
          rowsBoxBottom: Math.round(r(rowsBox).bottom),
          rowsScroll: rowsBox.scrollHeight - rowsBox.clientHeight,
          rowsBottom: Math.round(rows.length ? r(rows[rows.length - 1]).bottom : 0),
          poolTop: Math.round(r(pool).top), poolBottom: Math.round(r(pool).bottom), vh,
          poolBodyH: Math.round(poolBody ? r(poolBody).height : 0),
          poolScrolls: poolBody ? poolBody.scrollHeight > poolBody.clientHeight + 1 : false,
          rowsOutside, clippedInRows, rowCount: rows.length,
          rowsOverlapPool: rows.length ? r(rows[rows.length - 1]).bottom > r(pool).top + 1 : false,
          tileCount: tiles.length,
        };
      });
      const tilePx = parseInt(info.tile, 10);
      const problems = [];
      if (info.docScrollY > 1) problems.push(`page scrolls Y by ${info.docScrollY}`);
      if (info.docScrollX > 1) problems.push(`page scrolls X by ${info.docScrollX}`);
      if (info.fallback) {
        // Documented last resort (hundreds of items on a tiny window): tiers scroll inside their own box, which must still sit above the pool.
        if (info.rowsBoxBottom > info.poolTop + 1) problems.push('rows box overlaps pool');
      } else {
        if (info.rowsScroll > 1) problems.push(`rows scroll by ${info.rowsScroll}`);
        if (info.rowsOutside) problems.push(`${info.rowsOutside} rows outside viewport`);
        if (info.rowsOverlapPool) problems.push('rows overlap pool');
      }
      if (info.poolBottom > info.vh + 1) problems.push(`pool bottom ${info.poolBottom} > ${info.vh}`);
      if (!info.fallback && info.clippedInRows) problems.push(`${info.clippedInRows} tiles clipped in rows`);
      if (errors.length) problems.push(`page errors: ${errors[0].slice(0, 120)}`);
      ok = problems.length === 0;
      info.problems = problems; info.tilePx = tilePx;
      if (shotsDir && (sc.name === 'heavy-150-names' || sc.name === 'pool-321' || sc.name === 'balanced-60' || sc.name === 'stress-400')) {
        await page.screenshot({ path: `${shotsDir}/${sc.name}__${w}x${h}.png` });
      }
    } catch (e) { ok = false; info = { problems: [`error: ${String(e).slice(0, 200)}`] }; }
    results.push({ scenario: sc.name, vp: `${w}x${h}`, label, ok, tile: info.tilePx, fallback: info.fallback, problems: info.problems ?? [] });
    await ctx.close();
  }
}
await browser.close();
const bad = results.filter((r) => !r.ok);
const table = (rs) => rs.map((r) => `${r.ok ? (r.fallback ? 'fall' : 'ok  ') : 'FAIL'} ${r.scenario.padEnd(18)} ${r.vp.padEnd(10)} tile=${String(r.tile ?? '-').padEnd(4)} ${r.problems.join('; ')}`).join('\n');
console.log(table(results));
console.log(`\n${results.length - bad.length}/${results.length} viewports ok`);
process.exit(bad.length ? 1 : 0);
