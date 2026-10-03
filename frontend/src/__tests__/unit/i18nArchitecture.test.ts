// frontend/src/__tests__/unit/i18nArchitecture.test.ts
//
// Architecture guards for the dictionary. The rule: the locale dictionary reaches a component
// ONE way, `useDictionary()` (client) or `getDictionary()` (server-only metadata). These tests
// fail the moment someone reintroduces a second route for it.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ts } from 'ts-morph';

const SRC = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');
const FILES = walk(SRC)
  .filter((f) => !rel(f).startsWith('locales/'))
  .map((f) => ({ file: rel(f), text: fs.readFileSync(f, 'utf8') }));

const DICT_NAMES = new Set(['dict', 'dictionary', 'dictionaries']);

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** Runs `visit` on every node of every non-test source file and collects `file:line` offenders. */
function scan(visit: (node: ts.Node, sf: ts.SourceFile) => boolean, skip: (file: string) => boolean = () => false): string[] {
  const bad: string[] = [];
  for (const { file, text } of FILES) {
    if (skip(file)) continue;
    const sf = parse(file, text);
    const go = (n: ts.Node) => {
      if (visit(n, sf)) bad.push(`${file}:${lineOf(sf, n)}`);
      ts.forEachChild(n, go);
    };
    go(sf);
  }
  return bad;
}

function regexScan(re: RegExp, skip: (file: string) => boolean = () => false): string[] {
  const bad: string[] = [];
  for (const { file, text } of FILES) {
    if (skip(file)) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (re.test(line)) bad.push(`${file}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  return bad;
}

const inContext = (file: string) => file.startsWith('context/');

describe('i18n architecture: one way to reach the dictionary', () => {
  it('no component is given the dictionary as a JSX prop (use useDictionary())', () => {
    const bad = scan((n) => ts.isJsxAttribute(n) && DICT_NAMES.has(n.name.getText()), inContext);
    assert.deepEqual(bad, [], `JSX prop carrying a dictionary:\n${bad.join('\n')}`);
  });

  it('no props/interface/type declares a dictionary member (no second prop dictionary)', () => {
    const bad = scan(
      (n) => (ts.isPropertySignature(n) || ts.isPropertyDeclaration(n)) && n.name !== undefined && DICT_NAMES.has(n.name.getText()),
      inContext
    );
    assert.deepEqual(bad, [], `Props type with a dictionary member:\n${bad.join('\n')}`);
  });

  it('no component destructures a dictionary out of its props', () => {
    const bad = scan(
      (n) =>
        ts.isBindingElement(n) &&
        ts.isObjectBindingPattern(n.parent) &&
        (ts.isParameter(n.parent.parent) || ts.isVariableDeclaration(n.parent.parent)) &&
        DICT_NAMES.has((n.propertyName ?? n.name).getText()),
      inContext
    );
    assert.deepEqual(bad, [], `Dictionary destructured from props:\n${bad.join('\n')}`);
  });

  it('DictionaryContext is the only React context that carries the dictionary', () => {
    const bad = regexScan(/createContext<[^>]*\b(Dictionary|DictionaryContextValue)\b/, (f) => f === 'context/DictionaryContext.tsx');
    assert.deepEqual(bad, [], `A second dictionary context:\n${bad.join('\n')}`);
  });

  it('no module-level cache or store of dictionaries outside the loaders', () => {
    const bad = regexScan(/\b(new Map<[^>]*Dictionary|Record<Locale,\s*Dictionary|let\s+\w*[dD]ict\w*\s*(:|=))/, (f) =>
      f.startsWith('context/') || f.startsWith('i18n/')
    );
    assert.deepEqual(bad, [], `Dictionary stored outside the loaders:\n${bad.join('\n')}`);
  });

  it('getDictionary() (async, server) is only used by server-side code, never by a client component', () => {
    const bad: string[] = [];
    for (const { file, text } of FILES) {
      if (file.startsWith('i18n/') || file.startsWith('context/') || !/\bgetDictionary\b/.test(text)) continue;
      if (/^\s*['"]use client['"]/.test(text)) bad.push(`${file}: client component calls getDictionary()`);
      else if (!/(layout|page|metadata|route)\.tsx?$/.test(file) && !file.startsWith('app/')) bad.push(`${file}: getDictionary() outside an app route/metadata file`);
    }
    assert.deepEqual(bad, [], bad.join('\n'));
  });

  it('only the loader layer imports a locale bundle directly', () => {
    const bad = regexScan(
      /from\s+['"](@\/locales\/(en|pl|de|es|ja)|\.\.?\/(\.\.\/)*locales\/(en|pl|de|es|ja))(\/[^'"]*)?['"]/,
      (f) => f.startsWith('context/') || f.startsWith('i18n/') || f.startsWith('locales/')
    );
    assert.deepEqual(bad, [], `Locale bundle imported outside the loader layer:\n${bad.join('\n')}`);
  });
});

describe('i18n architecture: no dead fallbacks or hand-rolled templating', () => {
  it('no optional chaining on the dictionary (it is never undefined inside [locale])', () => {
    // Two helpers deliberately accept "no dictionary" (display-name helpers used outside React).
    const OPTIONAL_DICT_HELPERS = new Set(['components/ChaosWheelModal.tsx', 'utils/mapUtils.ts']);
    const bad = regexScan(/\b(dict|dictionary)\?[.[]/, (f) => inContext(f) || OPTIONAL_DICT_HELPERS.has(f));
    assert.deepEqual(bad, [], `dict?. found; the dictionary is always present:\n${bad.join('\n')}`);
  });

  it('no English fallback literal after a dictionary lookup (`dict.x.y || \'English\'`)', () => {
    const bad = regexScan(/\bdict(\.\w+)+\s*(\|\||\?\?)\s*['"`]/, inContext);
    assert.deepEqual(bad, [], `Dead fallback; add the key to every locale instead:\n${bad.join('\n')}`);
  });

  it('placeholders are filled with formatMessage(), not .replace(\'{name}\', ...) chains', () => {
    const bad = regexScan(/\.replace\(\s*(\/\\?\{\w+\\?\}\/g?|['"]\{\w+\}['"])/, (f) => f === 'utils/i18nFormat.ts');
    assert.deepEqual(bad, [], `Hand-rolled placeholder replacement:\n${bad.join('\n')}`);
  });

  it('plurals use ICU plural branches, not `count === 1 ? a : b` on dictionary strings', () => {
    const bad = regexScan(/[=!]==?\s*1\s*\?\s*dict\.|\b(count|n|total|length)\s*[=!]==?\s*1\s*\?\s*(t|dict)\b/, inContext);
    assert.deepEqual(bad, [], `Singular/plural picked in code:\n${bad.join('\n')}`);
  });
});
