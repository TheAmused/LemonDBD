// frontend/scripts/_partial.tsx
/** Finds keyword highlights that stop in the middle of an inflected word. */
import fs from 'node:fs'; import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderFormattedDbdText } from '../src/utils/textFormatter';
console.error = () => {};
const d = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../backend/app/translations/translations.json'),'utf8'));
const LETTER = /\p{L}/u;
const hits = new Map<string, {n:number; ex:string[]}>();
let checked = 0;
for (const kind of ['perks','addons','items','offerings']) {
  for (const [key, rec] of Object.entries<any>(d[kind])) {
    for (const [loc, tr] of Object.entries<any>(rec.translations||{})) {
      if (!tr?.description) continue; checked++;
      const html = renderToStaticMarkup(renderFormattedDbdText(tr.description, { highlightName: tr.name }));
      // walk markup: a <strong>/<kbd> whose text ends in a letter and is immediately
      // followed by more letters means the highlight cut a word in half.
      const re = /<(strong|kbd)\b[^>]*>([\s\S]*?)<\/\1>([^<]*)/g;
      let m;
      while ((m = re.exec(html))) {
        const inner = m[2].replace(/<[^>]+>/g,'');
        const after = m[3];
        if (!inner || !after) continue;
        if (LETTER.test(inner.slice(-1)) && LETTER.test(after[0])) {
          const tail = (after.match(/^\p{L}+/u)||[''])[0];
          const k = `${inner}|+${tail}`;
          const b = hits.get(k) || {n:0, ex:[]};
          b.n++; if (b.ex.length<3) b.ex.push(`${kind}/${loc}/${tr.name}`);
          hits.set(k,b);
        }
      }
    }
  }
}
console.log(`checked ${checked} descriptions`);
const sorted=[...hits.entries()].sort((a,b)=>b[1].n-a[1].n);
console.log(`distinct partial-word highlights: ${sorted.length}, total occurrences: ${sorted.reduce((s,[,v])=>s+v.n,0)}`);
for (const [k,v] of sorted.slice(0,30)) console.log(`  ${String(v.n).padStart(4)}x  ⟦${k.split('|')[0]}⟧${k.split('|')[1].slice(1)}   e.g. ${v.ex[0]}`);
