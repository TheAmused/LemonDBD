// frontend/src/__tests__/unit/i18nHygiene.test.ts
//
// Translation hygiene beyond the dictionary-access rules in i18nArchitecture.test.ts.
// (Key/placeholder/plural parity across locales lives in i18nTranslations.test.ts, and
//  "every key used in code exists" is enforced by the compiler: Dictionary is typed.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ts } from 'ts-morph';
import en from '@/locales/en';
import { codeModules, scanAst, scanLines, loadModules } from '../helpers/sourceGraph';
import { ratchet, countBy } from '../helpers/ratchet';

function leafKeys(o: unknown, out = new Set<string>()): Set<string> {
  if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) leafKeys(v, out);
    else out.add(k);
  }
  return out;
}

describe('i18n hygiene: dictionary keys', () => {
  it('no new dictionary key that nothing in the code references (dead keys only shrink)', () => {
    const corpus = codeModules().map((m) => m.text).join('\n');
    const dead = [...leafKeys(en)].filter((k) => !new RegExp(`\\b${k}\\b`).test(corpus));
    ratchet('deadDictionaryKeys', countBy(dead), 'dictionary keys no code references');
  });
});

describe('i18n hygiene: locale-aware formatting', () => {
  it('toLocaleString / toLocaleDateString / toLocaleTimeString always get the active locale', () => {
    const bad = scanAst((n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^toLocale(Date|Time)?String$/.test(n.expression.name.text) && n.arguments.length === 0);
    assert.deepEqual(bad, [], `Locale-less formatting (uses the server/browser locale, not the site's):\n${bad.join('\n')}`);
  });

  it('Intl.* formatters are constructed with a locale', () => {
    const bad = scanAst((n) => ts.isNewExpression(n) && /^Intl\./.test(n.expression.getText()) && (n.arguments?.length ?? 0) === 0);
    assert.deepEqual(bad, [], `new Intl.X() without a locale:\n${bad.join('\n')}`);
  });

  it("no hardcoded 'en-US' / 'en-GB' locale; take it from localeMeta in i18n/config.ts", () => {
    const bad = scanLines(/['"]en-(US|GB)['"]/, (m) => m.file === 'i18n/config.ts' || m.file === 'proxy.ts');
    assert.deepEqual(bad, [], `Hardcoded English locale:\n${bad.join('\n')}`);
  });
});

describe('i18n hygiene: rich text and HTML', () => {
  it('dangerouslySetInnerHTML is only used for the constant bootstrap script in the locale layout', () => {
    const bad = scanLines(/dangerouslySetInnerHTML/, (m) => m.file === 'app/[locale]/layout.tsx');
    assert.deepEqual(bad, [], `Raw HTML injection (dictionary strings go through RichText):\n${bad.join('\n')}`);
    const layout = loadModules().find((m) => m.file === 'app/[locale]/layout.tsx')!;
    assert.ok(/__html:\s*SIDEBAR_INIT_SCRIPT\b/.test(layout.text), 'the only allowed __html is the constant SIDEBAR_INIT_SCRIPT');
  });

  it('nothing assigns innerHTML except the admin changelog WYSIWYG editor (its HTML is admin-authored data, not dictionary text)', () => {
    const bad = scanLines(/\binnerHTML\b/, (m) => m.file === 'components/changelog/ChangelogEditorModal.tsx');
    assert.deepEqual(bad, [], `innerHTML assignment:\n${bad.join('\n')}`);
  });
});

describe('i18n hygiene: page metadata', () => {
  const mods = loadModules();
  const files = new Set(mods.map((m) => m.file));
  const exportsMeta = (f: string) => {
    const m = mods.find((x) => x.file === f);
    return !!m && /export\s+(const|async function|function)\s+(generateMetadata|metadata)\b/.test(m.text);
  };

  it('every page has a title source: its own or an ancestor layout exports generateMetadata/metadata', () => {
    const missing: string[] = [];
    for (const p of mods.map((m) => m.file).filter((f) => /^app\/\[locale\]\/(.*\/)?page\.tsx$/.test(f))) {
      const chain = [p];
      let d = p.replace(/\/page\.tsx$/, '');
      while (d.startsWith('app/[locale]')) {
        chain.push(`${d}/layout.tsx`);
        d = d.replace(/\/[^/]+$/, '');
      }
      chain.push('app/[locale]/layout.tsx');
      if (!chain.some((c) => files.has(c) && exportsMeta(c))) missing.push(p);
    }
    assert.deepEqual(missing, [], `Pages with no generateMetadata/metadata in their layout chain:\n${missing.join('\n')}`);
  });

  it('layout metadata is built with pageMetadata() so titles, canonical and hreflang stay uniform', () => {
    const bad: string[] = [];
    for (const m of mods) {
      if (!/^app\/\[locale\]\/.+\/layout\.tsx$/.test(m.file) && !/^app\/\[locale\]\/.+\/page\.tsx$/.test(m.file)) continue;
      if (/export\s+(const|async function|function)\s+generateMetadata\b/.test(m.text) && !/\bpageMetadata\(/.test(m.text)) bad.push(m.file);
      if (/export\s+const\s+metadata\b/.test(m.text)) bad.push(`${m.file} (static metadata object; use pageMetadata so it is localized)`);
    }
    assert.deepEqual(bad, [], bad.join('\n'));
  });
});

describe('i18n hygiene: no English baked into components', () => {
  // Props that carry user-visible words. `labelKey`, `className`, `aria-hidden` etc. don't match.
  const TEXTY = /^(aria-label|aria-description|(\w*[Ll]abel|\w*[Pp]laceholder|\w*[Tt]itle|\w*[Tt]ext|\w*[Mm]essage|\w*[Dd]escription|\w*[Hh]int|\w*[Cc]aption|\w*[Hh]eading|\w*[Tt]ooltip|\w*[Pp]rompt))$/;
  const hasWords = (s: string) => /[A-Za-z]{3}/.test(s);

  it('loading.tsx and skeleton/fallback components pass no literal text props (use labelKey / the dictionary)', () => {
    const bad = scanAst(
      (n) => {
        if (!ts.isJsxAttribute(n) || !TEXTY.test(n.name.getText())) return false;
        const init = n.initializer;
        if (!init) return false;
        if (ts.isStringLiteral(init)) return hasWords(init.text);
        return ts.isJsxExpression(init) && !!init.expression && ts.isStringLiteralLike(init.expression) && hasWords(init.expression.text);
      },
      (m) => !/(^|\/)(loading\.tsx|[A-Za-z]*(Skeleton|Fallback)[A-Za-z]*\.tsx)$/.test(m.file)
    );
    assert.deepEqual(bad, [], `Hardcoded English in a loading/skeleton file:\n${bad.join('\n')}`);
  });

  it('component props never default to an English string (`placeholder = \'Search...\'`); read the dictionary instead', () => {
    const bad = scanAst(
      (n) =>
        (ts.isParameter(n) || ts.isBindingElement(n)) &&
        !!n.initializer &&
        ts.isStringLiteralLike(n.initializer) &&
        hasWords(n.initializer.text) &&
        TEXTY.test(n.name.getText()) &&
        // component props only: a destructured object parameter
        ts.isObjectBindingPattern(ts.isBindingElement(n) ? n.parent : n.parent) &&
        /\.tsx$/.test(n.getSourceFile().fileName)
    );
    assert.deepEqual(bad, [], `English default prop values:\n${bad.join('\n')}`);
  });
});
