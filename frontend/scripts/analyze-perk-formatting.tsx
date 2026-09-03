// frontend/scripts/analyze-perk-formatting.tsx
/**
 * Diagnostic harness: runs renderFormattedDbdText over the real translation
 * corpus and reports formatting defects. Not part of the app build.
 *
 * Usage: npx tsx scripts/analyze-perk-formatting.tsx [--batch N] [--size N] [--locale xx] [--kind perks]
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderFormattedDbdText } from '../src/utils/textFormatter';

const TRANSLATIONS = path.resolve(
  __dirname,
  '../../backend/app/translations/translations.json'
);

type Entry = { kind: string; key: string; locale: string; name: string; text: string };

function loadCorpus(): Entry[] {
  const data = JSON.parse(fs.readFileSync(TRANSLATIONS, 'utf8'));
  const out: Entry[] = [];
  for (const kind of ['perks', 'addons', 'items', 'offerings']) {
    const group = data[kind] || {};
    for (const [key, rec] of Object.entries<any>(group)) {
      for (const [locale, tr] of Object.entries<any>(rec.translations || {})) {
        if (tr?.description) {
          out.push({ kind, key, locale, name: tr.name || key, text: tr.description });
        }
      }
    }
  }
  return out;
}

/** Decode the entities renderToStaticMarkup introduces, so `plain` is true text. */
function decode(x: string) {
  return x
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Render to markup, then map each highlight class back to the text it wrapped. */
function analyze(e: Entry) {
  const html = renderToStaticMarkup(
    renderFormattedDbdText(e.text, { highlightName: e.name })
  );
  const highlighted = new Set<string>();
  for (const m of html.matchAll(/<(?:strong|kbd|em)[^>]*>([\s\S]*?)<\/(?:strong|kbd|em)>/g)) {
    highlighted.add(decode(m[1].replace(/<[^>]+>/g, '')).trim());
  }
  // Block tags become newlines; inline tags vanish so adjacent text stays contiguous.
  const plain = decode(
    html
      .replace(/<\/(?:p|li|div|ul)>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
  return { html, plain, highlighted };
}

const reactWarnings = new Set<string>();
const origError = console.error;
console.error = (...a: unknown[]) => { reactWarnings.add(String(a[0]).split('\n')[0]); };

const issues: Record<string, { count: number; samples: string[] }> = {};
function flag(id: string, sample: string) {
  const b = (issues[id] ??= { count: 0, samples: [] });
  b.count++;
  if (b.samples.length < 6) b.samples.push(sample);
}

/** Detect a numeric/unit token in the SOURCE that the renderer failed to highlight. */
function checkNumbers(e: Entry, a: ReturnType<typeof analyze>) {
  // Flavor quotes carry lore citations ("Adiris' Tafel, 3,7") that are chapter:verse
  // references, not game values - they are correctly left unhighlighted.
  const src = decode(e.text.replace(/<[^>]+>/g, ' '))
    .split(/\r?\n/)
    .filter((l) => !/[„"“«].*[”"»]|\((?:[^()]*,\s*\d)/.test(l))
    .join('\n');
  const hl = [...a.highlighted].map((h) => h.replace(/\s+/g, ' '));
  // A token counts as covered when it sits inside a highlighted run at a numeric
  // boundary — so "5%" inside the highlighted "+5%" is not reported as a miss.
  const covered = (tok: string) => {
    const t = tok.replace(/\s+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\d.,])${t}`);
    return hl.some((h) => re.test(h));
  };

  // decimal-comma values: "3,5%", "0,06 s" — comma is the decimal mark in pl/de/es
  for (const m of src.matchAll(/\d+,\d+\s*(?:%|s|m)?\b/g)) {
    if (!covered(m[0].trim())) flag('decimal-comma-not-highlighted', `${e.kind}/${e.locale}/${e.name}: "${m[0].trim()}"`);
  }
  // abbreviated units: "4 m", "30 s", "24m"
  for (const m of src.matchAll(/(?<![\w,.])\d+(?:[.,]\d+)?\s?(?:m|s)(?![\w])/g)) {
    if (!covered(m[0].trim())) flag('abbrev-unit-not-highlighted', `${e.kind}/${e.locale}/${e.name}: "${m[0].trim()}"`);
  }
  // plain integer percent must always highlight
  for (const m of src.matchAll(/(?<![\w,.])\d+\s?%/g)) {
    if (!covered(m[0].trim())) flag('percent-not-highlighted', `${e.kind}/${e.locale}/${e.name}: "${m[0].trim()}"`);
  }
}

/** Defects visible in the rendered output. */
function checkText(e: Entry, a: ReturnType<typeof analyze>) {
  const p = a.plain;
  const ctx = (re: RegExp) => (p.match(re)?.[0] || '').replace(/\n/g, '\\n');

  // sentence glued to the next one: "wątrób.Zwiększa"
  if (/[\p{Ll}\d%)][.!?][\p{Lu}]/u.test(p))
    flag('missing-space-after-sentence', `${e.kind}/${e.locale}/${e.name}: …${ctx(/.{0,22}[\p{Ll}\d%)][.!?][\p{Lu}].{0,22}/u)}…`);
  if (/\d\s*%\s*%/.test(p))
    flag('double-percent', `${e.kind}/${e.locale}/${e.name}: …${ctx(/.{0,25}%\s*%.{0,12}/)}…`);
  if (/&(?:[a-z]+|#\d+);/i.test(e.text.replace(/&(?:quot|amp|nbsp|#39);/gi, '')))
    flag('unhandled-entity-in-source', `${e.kind}/${e.locale}/${e.name}: ${e.text.replace(/&(?:quot|amp|nbsp|#39);/gi,'').match(/&(?:[a-z]+|#\d+);/i)?.[0]}`);
  if (/<\/?[a-z]/i.test(p))
    flag('leftover-html-tag', `${e.kind}/${e.locale}/${e.name}: ${ctx(/<\/?[a-z][^>]{0,20}>?/i)}`);
  if (/\{[A-Za-z][^}]*\}/.test(p))
    flag('unresolved-input-token', `${e.kind}/${e.locale}/${e.name}: ${ctx(/\{[A-Za-z][^}]*\}/)}`);
  if (/\S\s+[,.;:](?:\s|$)/.test(p))
    flag('space-before-punctuation', `${e.kind}/${e.locale}/${e.name}: …${ctx(/.{0,22}\S\s+[,.;:](?:\s|$).{0,12}/)}…`);
  if (/\*/.test(p))
    flag('stray-asterisk', `${e.kind}/${e.locale}/${e.name}: …${ctx(/.{0,22}\*.{0,12}/)}…`);
  if (/\s{2,}/.test(p))
    flag('double-space', `${e.kind}/${e.locale}/${e.name}: …${ctx(/.{0,22}\s{2,}.{0,12}/)}…`);
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n: string, d?: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const size = Number(opt('size', '150'));
  const batch = Number(opt('batch', '1'));
  const locale = opt('locale');
  const kind = opt('kind');

  let corpus = loadCorpus();
  if (locale) corpus = corpus.filter((e) => e.locale === locale);
  if (kind) corpus = corpus.filter((e) => e.kind === kind);
  corpus.sort((a, b) => `${a.kind}${a.key}${a.locale}`.localeCompare(`${b.kind}${b.key}${b.locale}`));

  const slice = corpus.slice((batch - 1) * size, batch * size);
  console.log(`Corpus ${corpus.length} entries. Batch ${batch}: ${slice.length} entries.\n`);

  for (const e of slice) {
    let a;
    try {
      a = analyze(e);
    } catch (err) {
      flag('render-throw', `${e.kind}/${e.locale}/${e.name}: ${(err as Error).message}`);
      continue;
    }
    checkNumbers(e, a);
    checkText(e, a);
  }

  if (reactWarnings.size) {
    origError('### react-warnings');
    for (const w of reactWarnings) origError('    ' + w);
    origError();
  }

  const sorted = Object.entries(issues).sort((x, y) => y[1].count - x[1].count);
  if (!sorted.length) { console.log('No issues detected.'); return; }
  for (const [id, b] of sorted) {
    console.log(`### ${id} — ${b.count} occurrence(s)`);
    for (const s of b.samples) console.log(`    ${s}`);
    console.log();
  }
}

main();
