// frontend/scripts/_kw.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { renderFormattedDbdText } from '../src/utils/textFormatter';
const cases = [
  ['pl','Naprawiasz generatory o 5% szybciej. Aury generatorów są ujawniane. Zasięgu Terroru.'],
  ['pl','Ocalali w Zasięgu Terroru cierpią na Wyczerpanie. Palety i totemy.'],
  ['de','Überlebende im Terrorradius erhalten Fähigkeits-Checks an Generatoren.'],
  ['es','Los supervivientes reparan generadores y ven las auras de los totems.'],
  ['ja','呪術：オーラを表示する。スキルチェックが発生する。'],
  ['en','Survivors repairing Generators see the Auras of Hooked Survivors.'],
];
for (const [l, t] of cases) {
  const html = renderToStaticMarkup(renderFormattedDbdText(t));
  const marked = html.replace(/<(strong|kbd)[^>]*>([\s\S]*?)<\/\1>/g,(_m,_t,i)=>'⟦'+i.replace(/<[^>]+>/g,'')+'⟧')
    .replace(/<[^>]+>/g,'');
  console.log(`[${l}] ${marked}`);
}
