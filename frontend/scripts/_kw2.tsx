// frontend/scripts/_kw2.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { renderFormattedDbdText, TOKEN_REGEX } from '../src/utils/textFormatter';
const t = 'Aury generatorów. Generatoren an. los generadores y totems. Hooked Survivors.';
console.log('SPLIT:', JSON.stringify('Aury generatorów'.split(TOKEN_REGEX)));
console.log('SPLIT2:', JSON.stringify('Generatoren an'.split(TOKEN_REGEX)));
console.log('SPLIT3:', JSON.stringify('los totems'.split(TOKEN_REGEX)));
const html = renderToStaticMarkup(renderFormattedDbdText(t));
console.log(html.replace(/></g,'>\n<'));
