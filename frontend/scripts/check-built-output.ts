// frontend/scripts/check-built-output.ts
//
// Post-build guard (run after `next build`):   npm run check:built
//
//  1. The dictionary stays OUT of the HTML. Each locale's dictionary ships as its own hashed,
//     immutable chunk the browser caches; if a prerendered page starts embedding it (for example
//     a server component serializing `dict` into props) every page weighs ~100KB more and the cache
//     is defeated. We look for text unique to many different namespaces: a page legitimately shows
//     one or two, the whole dictionary shows them all.
//  2. Per-route client JavaScript (gzip) stays under a budget. New routes get DEFAULT_BUDGET_KB;
//     existing ones are held to their baselined size + 10% (scripts/bundle-budgets.json). Refresh
//     after a deliberate change:   UPDATE_BUDGETS=1 npm run check:built
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import en from '../src/locales/en';

const NEXT = path.resolve(__dirname, '../.next');
const APP = path.join(NEXT, 'server/app');
const BUDGETS = path.resolve(__dirname, 'bundle-budgets.json');
const DEFAULT_BUDGET_KB = 400;
const HEADROOM = 1.1;
const MAX_SENTINELS_PER_PAGE = 3;
const MAX_HTML_KB = 200;

if (!fs.existsSync(APP)) {
  console.error('No .next build found. Run `npm run build` first.');
  process.exit(1);
}

const failures: string[] = [];

function walk(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, match, out);
    else if (match.test(e.name)) out.push(full);
  }
  return out;
}

// ---- 1. dictionary out of HTML ------------------------------------------------------------
function longestString(o: unknown): string {
  let best = '';
  const go = (v: unknown) => {
    if (typeof v === 'string') {
      // Plain text only: skip templates/markup that the HTML would not contain verbatim.
      if (v.length > best.length && !/[{}<>&"']/.test(v) && v.length < 200) best = v;
    } else if (v && typeof v === 'object') Object.values(v).forEach(go);
  };
  go(o);
  return best;
}
const sentinels = Object.entries(en as Record<string, unknown>)
  .map(([ns, v]) => ({ ns, text: longestString(v) }))
  .filter((s) => s.text.length >= 40);

for (const file of walk(APP, /\.html$/)) {
  const html = fs.readFileSync(file, 'utf8');
  const route = path.relative(APP, file).split(path.sep).join('/');
  const kb = Buffer.byteLength(html) / 1024;
  if (kb > MAX_HTML_KB) failures.push(`${route}: HTML is ${kb.toFixed(0)}KB (> ${MAX_HTML_KB}KB); is the dictionary being serialized into the page?`);
  if (!route.startsWith('en')) continue;
  const hits = sentinels.filter((s) => html.includes(s.text));
  if (hits.length > MAX_SENTINELS_PER_PAGE) {
    failures.push(`${route}: contains text from ${hits.length} unrelated dictionary namespaces (${hits.map((h) => h.ns).join(', ')}); the dictionary leaked into the HTML`);
  }
}

// ---- 2. per-route client JS budget -------------------------------------------------------
function chunkFiles(manifestPath: string): Set<string> {
  const src = fs.readFileSync(manifestPath, 'utf8');
  const json = JSON.parse(src.slice(src.indexOf('= {') + 2).replace(/;\s*$/, ''));
  const files = new Set<string>();
  const collect = (v: unknown) => {
    if (typeof v === 'string' && /\/_next\/static\/.*\.js$/.test(v)) files.add(v.replace(/^.*\/_next\//, ''));
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(json.clientModules);
  collect(json.entryJSFiles);
  return files;
}

const measured: Record<string, number> = {};
for (const manifest of walk(APP, /^page_client-reference-manifest\.js$/)) {
  const route = '/' + path.relative(APP, path.dirname(manifest)).split(path.sep).join('/');
  let gz = 0;
  for (const f of chunkFiles(manifest)) {
    const file = path.join(NEXT, f);
    if (fs.existsSync(file)) gz += zlib.gzipSync(fs.readFileSync(file)).length;
  }
  measured[route] = Math.ceil(gz / 1024);
}

if (process.env.UPDATE_BUDGETS) {
  const out = Object.fromEntries(Object.entries(measured).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BUDGETS, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(out).length} route budgets to scripts/bundle-budgets.json`);
} else {
  const base: Record<string, number> = fs.existsSync(BUDGETS) ? JSON.parse(fs.readFileSync(BUDGETS, 'utf8')) : {};
  for (const [route, kb] of Object.entries(measured)) {
    const allowed = route in base ? Math.ceil(base[route] * HEADROOM) : DEFAULT_BUDGET_KB;
    if (kb > allowed) failures.push(`${route}: ${kb}KB gzip client JS exceeds its budget of ${allowed}KB (${route in base ? 'baseline ' + base[route] + 'KB + 10%' : 'default for new routes'})`);
  }
}

if (failures.length) {
  console.error(`\n❌ Built-output check failed:\n${failures.map((f) => '  - ' + f).join('\n')}\n`);
  process.exit(1);
}
console.log(`✅ Built output OK: ${walk(APP, /\.html$/).length} pages, ${Object.keys(measured).length} route bundles within budget, dictionary not in HTML.`);
