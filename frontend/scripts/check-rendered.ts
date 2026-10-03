// frontend/scripts/check-rendered.ts
//
// Rendered checks in a real browser (Playwright/Chromium) against a RUNNING site:
//   npm run check:rendered              (CHECK_BASE_URL, default http://localhost)
//
//  1. Touch targets: on a phone viewport every visible control must be at least 44x44 CSS px,
//     measured from its real bounding box (not guessed from Tailwind classes).
//  2. Themes: every page is loaded in light, light-lemon and dark, and every piece of visible text
//     must keep its contrast against the background it actually sits on (WCAG AA 4.5:1, or 3:1 for
//     large text). Text below 1.5:1 is invisible, which is always a failure.
//
// Pages come from src/app/[locale]/**/page.tsx (dynamic segments skipped), so a new page is
// covered the moment it exists. Existing problems are held in scripts/rendered-baseline.json and
// can only shrink; a new page starts at zero. Refresh after fixing:  UPDATE_RENDERED_BASELINE=1
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const BASE = (process.env.CHECK_BASE_URL ?? 'http://localhost').replace(/\/$/, '');
const LOCALE = process.env.CHECK_LOCALE ?? 'en';
const BASELINE = path.resolve(__dirname, 'rendered-baseline.json');
const APP = path.resolve(__dirname, '../src/app/[locale]');
const THEMES = ['light', 'light-lemon', 'dark'] as const;
const MIN_TARGET = 44;
const INVISIBLE_RATIO = 1.5;

interface Baseline {
  touch: Record<string, number>;
  contrast: Record<string, number>;
}

function routes(dir = APP, segs: string[] = [], out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!e.name.startsWith('[') && !e.name.startsWith('_')) routes(path.join(dir, e.name), [...segs, e.name], out);
    } else if (e.name === 'page.tsx') out.push('/' + segs.join('/'));
  }
  return out.sort();
}

async function load(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  } catch {
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }
  await page.waitForTimeout(1200);
}

interface TouchHit {
  tag: string;
  label: string;
  w: number;
  h: number;
}

function measureTouch(min: number): TouchHit[] {
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=menuitem], [role=option]';
  const out: TouchHit[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[aria-hidden="true"], [inert]')) continue;
    let r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Visually-hidden native inputs (custom checkboxes/switches) are operated through their label.
    const label = el.closest('label') ?? (el.id ? document.querySelector<HTMLElement>(`label[for="${CSS.escape(el.id)}"]`) : null);
    if (el.tagName === 'INPUT' && label && (r.width < 4 || r.height < 4 || cs.opacity === '0')) r = label.getBoundingClientRect();
    // Inline links inside running text are exempt (WCAG 2.5.8 "inline" exception).
    if (el.tagName === 'A' && cs.display === 'inline' && (el.parentElement?.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 12) continue;
    if (r.width + 0.5 >= min && r.height + 0.5 >= min) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    out.push({ tag: el.tagName.toLowerCase(), label: name || 'unnamed', w: Math.round(r.width), h: Math.round(r.height) });
  }
  return out;
}

interface ContrastHit {
  tag: string;
  text: string;
  ratio: number;
  fg: string;
  bg: string;
}

function measureContrast(invisible: number): ContrastHit[] {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const rgba = (css: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top: number[], bottom: number[]) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat(a);
  };
  const lum = (c: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratioOf = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const out: ContrastHit[] = [];
  const seen = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!el || text.length < 2 || !/[\p{L}\p{N}]/u.test(text)) continue;
    if (el.closest('script, style, noscript, svg, [aria-hidden="true"], [inert], .sr-only, option')) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rr = range.getBoundingClientRect();
    if (rr.width < 2 || rr.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if ((el as HTMLButtonElement).disabled || el.closest('[disabled], [aria-disabled="true"]')) continue;

    // Effective opacity and the stack of backgrounds behind the text.
    let opacity = 1;
    let unknownBg = false;
    const layers: number[][] = [];
    for (let p: HTMLElement | null = el; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      opacity *= parseFloat(pcs.opacity);
      if (pcs.backgroundImage !== 'none') {
        unknownBg = true; // gradients/images: cannot know the colour behind the text
        break;
      }
      const bg = rgba(pcs.backgroundColor);
      if (bg[3] > 0) {
        layers.push(bg);
        if (bg[3] >= 0.999) break;
      }
    }
    // A sibling highlight (sliding pill, selection backdrop) drawn behind the text is invisible to the ancestor walk.
    const cx = rr.left + rr.width / 2;
    const cy = rr.top + rr.height / 2;
    for (let p: HTMLElement | null = el; p && p !== document.body && !unknownBg; p = p.parentElement) {
      for (const sib of Array.from(p.parentElement?.children ?? [])) {
        if (sib === p || sib.contains(el)) continue;
        const scs = getComputedStyle(sib);
        if (scs.position === 'static' || scs.display === 'none') continue;
        const r = sib.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        if (scs.backgroundImage !== 'none' || rgba(scs.backgroundColor)[3] > 0) unknownBg = true;
      }
    }
    if (unknownBg || opacity < 0.05) continue;
    let base: number[] = [0, 0, 0, 0];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    if (base[3] < 0.999) continue; // never reached an opaque surface
    const fgRaw = rgba(cs.color);
    const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], base);
    const ratio = ratioOf(fg, base);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio >= need && ratio >= invisible) continue;
    const key = `${el.tagName}|${text.slice(0, 20)}|${ratio.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 28),
      ratio: Math.round(ratio * 100) / 100,
      fg: fg.slice(0, 3).map(Math.round).join(','),
      bg: base.slice(0, 3).map(Math.round).join(','),
    });
  }
  return out;
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ executablePath }).catch((e: Error) => {
    console.error(`Could not start Chromium (${e.message.split('\n')[0]}).\nInstall it once with: npx playwright install chromium`);
    process.exit(1);
  });
  const pages = routes();
  const touch: Record<string, number> = {};
  const contrast: Record<string, number> = {};
  const invisible: string[] = [];
  const details: string[] = [];

  // 1. touch targets: phone viewport, default theme per route
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await phone.addInitScript('window.__name = (f) => f;');
  await phone.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const phonePage = await phone.newPage();
  for (const route of pages) {
    await load(phonePage, `${BASE}/${LOCALE}${route === '/' ? '' : route}`);
    const hits = await phonePage.evaluate(measureTouch, MIN_TARGET);
    for (const h of hits) {
      const key = `${route}|${h.tag}|${h.label}`;
      touch[key] = (touch[key] ?? 0) + 1;
      details.push(`touch  ${route}  <${h.tag}> "${h.label}" is ${h.w}x${h.h}`);
    }
  }
  await phone.close();

  // 2. themes: desktop viewport, every theme
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript('window.__name = (f) => f;');
    await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
    const page = await ctx.newPage();
    for (const route of pages) {
      await load(page, `${BASE}/${LOCALE}${route === '/' ? '' : route}`);
      const applied = await page.evaluate(() => document.documentElement.className);
      if (!applied.split(/\s+/).includes(theme)) {
        console.error(`Theme "${theme}" was not applied on ${route} (html class: "${applied}")`);
        process.exit(1);
      }
      const hits = await page.evaluate(measureContrast, INVISIBLE_RATIO);
      contrast[`${theme}|${route}`] = hits.length;
      for (const h of hits) {
        details.push(`theme  ${theme}  ${route}  <${h.tag}> "${h.text}" ${h.ratio}:1 (fg ${h.fg} on ${h.bg})`);
        if (h.ratio < INVISIBLE_RATIO) invisible.push(`${theme} ${route}: "${h.text}" is ${h.ratio}:1, effectively invisible`);
      }
    }
    await ctx.close();
  }
  await browser.close();

  if (process.env.UPDATE_RENDERED_BASELINE) {
    const sort = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).filter(([, v]) => v > 0));
    fs.writeFileSync(BASELINE, JSON.stringify({ touch: sort(touch), contrast: sort(contrast) }, null, 2) + '\n');
    console.log(`Baseline written: ${Object.keys(touch).length} touch entries, ${Object.values(contrast).reduce((a, b) => a + b, 0)} contrast findings.`);
    return;
  }

  const base: Baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { touch: {}, contrast: {} };
  const failures: string[] = [...invisible];
  for (const [k, n] of Object.entries(touch)) if (n > (base.touch[k] ?? 0)) failures.push(`touch target below ${MIN_TARGET}px: ${k.replace(/\|/g, '  ')} (x${n}, allowed ${base.touch[k] ?? 0})`);
  for (const [k, n] of Object.entries(contrast)) if (n > (base.contrast[k] ?? 0)) failures.push(`contrast: ${k.replace('|', '  ')} has ${n} low-contrast text runs (allowed ${base.contrast[k] ?? 0})`);

  if (process.env.CHECK_VERBOSE) console.log(details.join('\n'));
  if (failures.length) {
    console.error(`\n❌ Rendered check failed:\n${[...new Set(failures)].map((f) => '  - ' + f).join('\n')}\n(run with CHECK_VERBOSE=1 for every element)`);
    process.exit(1);
  }
  const fixed = Object.keys(base.touch).filter((k) => (touch[k] ?? 0) < base.touch[k]).length + Object.keys(base.contrast).filter((k) => (contrast[k] ?? 0) < base.contrast[k]).length;
  console.log(`✅ Rendered check OK: ${pages.length} pages x ${THEMES.length} themes, touch targets and contrast within baseline.${fixed ? `\n   ${fixed} baseline entries improved; lock it in with UPDATE_RENDERED_BASELINE=1.` : ''}`);
}

void main();
