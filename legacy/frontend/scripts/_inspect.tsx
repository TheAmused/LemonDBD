// frontend/scripts/_inspect.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs'; import path from 'node:path';
import { renderFormattedDbdText } from '../src/utils/textFormatter';
const d = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../backend/app/translations/translations.json'),'utf8'));
function show(kind: string, key: string, locales: string[]) {
  for (const l of locales) {
    const t = d[kind][key]?.translations?.[l]; if (!t) continue;
    const html = renderToStaticMarkup(renderFormattedDbdText(t.description, { highlightName: t.name }));
    const marked = html.replace(/<(strong|kbd)[^>]*>([\s\S]*?)<\/\1>/g, (_m,_t,inner)=>'⟦'+inner.replace(/<[^>]+>/g,'')+'⟧')
      .replace(/<\/(p|li|div)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
    console.log(`===== ${key} [${l}] =====`);
    console.log(marked.split('\n').map(s=>s.trim()).filter(Boolean).join('\n'));
    console.log();
  }
}
show('perks','Bardic Inspiration',['en','pl']);
