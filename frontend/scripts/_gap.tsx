// frontend/scripts/_gap.tsx
/** Inflected forms of known keywords that receive no highlight at all. */
import fs from 'node:fs'; import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderFormattedDbdText, DBD_KEYWORDS } from '../src/utils/textFormatter';
console.error = () => {};
const d = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../backend/app/translations/translations.json'),'utf8'));
// Latin-script keywords only; CJK has no spaces so prefix logic does not apply.
const stems = DBD_KEYWORDS
  .filter(k => /^[\p{L}][\p{L} '\-]*$/u.test(k) && k.length >= 5 && !/[　-鿿＀-￯]/.test(k))
  .map(k => k.toLowerCase());
const stemSet = new Set(stems);
const gaps = new Map<string,{n:number; ex:string[]; stem:string}>();
for (const kind of ['perks','addons','items','offerings']) {
  for (const rec of Object.values<any>(d[kind])) {
    for (const [loc, tr] of Object.entries<any>(rec.translations||{})) {
      if (!tr?.description || loc === 'ja') continue;
      const html = renderToStaticMarkup(renderFormattedDbdText(tr.description, { highlightName: tr.name }));
      const hl = new Set<string>();
      for (const m of html.matchAll(/<(strong|kbd)\b[^>]*>([\s\S]*?)<\/\1>/g))
        hl.add(m[2].replace(/<[^>]+>/g,'').trim().toLowerCase());
      const plain = html.replace(/<[^>]+>/g,' ');
      for (const wm of plain.matchAll(/\p{L}{4,}/gu)) {
        const w = wm[0].toLowerCase();
        if (hl.has(w) || stemSet.has(w)) continue;
        const stem = stems.find(s => w.startsWith(s) && w.length > s.length && w.length - s.length <= 4);
        if (!stem) continue;
        if ([...hl].some(h => h.includes(w))) continue;
        const b = gaps.get(w) || {n:0, ex:[], stem};
        b.n++; if (b.ex.length<2) b.ex.push(`${loc}/${tr.name}`);
        gaps.set(w,b);
      }
    }
  }
}
const sorted=[...gaps.entries()].sort((a,b)=>b[1].n-a[1].n);
console.log(`distinct unmatched inflected forms: ${sorted.length}; total occurrences: ${sorted.reduce((s,[,v])=>s+v.n,0)}`);
for (const [w,v] of sorted.slice(0,35)) console.log(`  ${String(v.n).padStart(4)}x  ${w}  (stem "${v.stem}")  e.g. ${v.ex[0]}`);
