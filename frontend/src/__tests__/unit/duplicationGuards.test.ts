// frontend/src/__tests__/unit/duplicationGuards.test.ts
//
// Copy-paste guards. The style checks (npm run check:styles) catch a wrong value; these catch the same
// thing written out again instead of shared: a class list pasted into several files, a colour typed where a
// token exists, a local component that re-implements one from components/common. Colour debt that is left
// is held by a ratchet (baselines/*.json): it may only shrink. Fix by extracting a component (components/common/, or a
// feature folder when only one feature needs it) and see docs/style-sources.md for where each look lives.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ts } from 'ts-morph';
import { SRC, codeModules, exportsOf, scanAst } from '../helpers/sourceGraph';
import { ratchet, countBy } from '../helpers/ratchet';

const isStringNode = (n: ts.Node): n is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
  ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);

/** A declaration written directly in the module, not inside another component. */
const isTopLevel = (n: ts.Node): boolean =>
  ts.isVariableDeclaration(n) ? ts.isSourceFile(n.parent.parent.parent) : ts.isSourceFile(n.parent);

describe('duplication: pasted class lists', () => {
  // Long enough that two copies are a pattern, not a coincidence (`flex items-center gap-2`).
  const MIN_CHARS = 45;
  const MIN_CLASSES = 5;
  const MIN_COPIES = 3;

  it(`a className of ${MIN_CHARS}+ characters appears at most ${MIN_COPIES - 1} times (a third copy wants a component)`, () => {
    const groups = new Map<string, { texts: string[]; files: string[] }>();
    for (const m of codeModules()) {
      if (m.file.startsWith('components/common/')) continue;
      const visit = (n: ts.Node, inClassName: boolean) => {
        const here = inClassName || (ts.isJsxAttribute(n) && /^(className|class)$/.test(n.name.getText()));
        if (here && isStringNode(n)) {
          const classes = n.text.split(/\s+/).filter(Boolean);
          if (n.text.trim().length >= MIN_CHARS && classes.length >= MIN_CLASSES) {
            const key = [...classes].sort().join(' ');
            const g = groups.get(key) ?? { texts: [], files: [] };
            g.texts.push(classes.join(' '));
            g.files.push(m.file);
            groups.set(key, g);
          }
        }
        ts.forEachChild(n, (c) => visit(c, here));
      };
      visit(m.ast, false);
    }
    const ids: string[] = [];
    for (const g of groups.values()) {
      if (g.files.length < MIN_COPIES) continue;
      const label = [...g.texts].sort()[0].slice(0, 90);
      for (const f of g.files) ids.push(`${f} :: ${label}`);
    }
    assert.deepEqual(
      ids,
      [],
      `Class lists pasted into ${MIN_COPIES}+ places. Extract a component (components/common/ or the feature folder) or a shared constant:\n${ids.join('\n')}`
    );
  });
});

describe('duplication: colours typed instead of tokens', () => {
  const COLOUR = /#[0-9a-fA-F]{6,8}\b|#[0-9a-fA-F]{3}\b|\brgba?\(|\bhsla?\(/;

  it('string colour literals (#hex, rgb(), hsl()) in code only shrink; use a --color-* token or a theme class', () => {
    // Canvas drawing, user-pickable palettes and SVG artwork legitimately need raw values and sit in the baseline.
    const bad = scanAst((n) => isStringNode(n) && COLOUR.test(n.text));
    ratchet('colourLiterals', countBy(bad.map((b) => b.split(':')[0])), 'colour literals in code');
  });

  it('colour literals in stylesheets outside tokens.css and base.css (the theme definitions) only shrink', () => {
    const dir = path.join(SRC, 'app/styles');
    const counts: Record<string, number> = {};
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.css') && !/^(tokens|base)\.css$/.test(f))) {
      const lines = fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/);
      const n = lines.filter((l) => COLOUR.test(l.replace(/\/\*.*?\*\//g, ''))).length;
      if (n) counts[`app/styles/${name}`] = n;
    }
    ratchet('cssColourLiterals', counts, 'colour literals in stylesheets');
  });
});

describe('duplication: local copies of shared components', () => {
  it('no component outside components/common is named like one that lives there', () => {
    const shared = new Set<string>();
    for (const m of codeModules()) {
      if (!m.file.startsWith('components/common/')) continue;
      for (const e of exportsOf(m)) if (/^[A-Z]/.test(e.name)) shared.add(e.name);
    }
    const bad = scanAst(
      (n) => {
        let name: string | undefined;
        if (ts.isFunctionDeclaration(n) && n.name) name = n.name.text;
        else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
          // `const Modal = dynamic(() => import(common/Modal))` is a lazy handle to the shared one, not a copy.
          const init = n.initializer;
          const lazy = ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'dynamic';
          if (!lazy) name = n.name.text;
        }
        return !!name && shared.has(name) && isTopLevel(n);
      },
      (m) => m.file.startsWith('components/common/') || !m.file.endsWith('.tsx')
    );
    assert.deepEqual(bad, [], `A local component shares a name with a shared one. Use the shared one, or give the local one a name that says what differs:\n${bad.join('\n')}`);
  });
});
