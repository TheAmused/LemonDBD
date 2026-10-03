// frontend/src/__tests__/unit/uiGuards.test.ts
//
// UI, accessibility and theming guards. Typography and global-style rules live in
// scripts/check-typography.ts and scripts/check-global-styles.ts (npm run check:styles).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ts } from 'ts-morph';
import { scanAst, scanLines } from '../helpers/sourceGraph';
import { ratchet, countBy } from '../helpers/ratchet';

const attrNames = (el: ts.JsxOpeningLikeElement) => el.attributes.properties.map((a) => (ts.isJsxAttribute(a) ? a.name.getText() : '...'));

describe('ui: accessible names', () => {
  it('every icon-only <button> has an aria-label (from the dictionary), a title or a spread that supplies one', () => {
    const bad = scanAst((n) => {
      if (!ts.isJsxElement(n) || n.openingElement.tagName.getText() !== 'button') return false;
      if (attrNames(n.openingElement).some((a) => /^(aria-label|aria-labelledby|title|\.\.\.)$/.test(a))) return false;
      const kids = n.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()));
      return kids.length > 0 && kids.every((c) => ts.isJsxSelfClosingElement(c) && /^[A-Z]/.test(c.tagName.getText()));
    });
    assert.deepEqual(bad, [], `Icon-only buttons with no accessible name:\n${bad.join('\n')}`);
  });

  it('aria-label / alt / placeholder / title attributes are never plain string literals', () => {
    // Plain literals are English-only; they must come from the dictionary. (scripts/check-hardcoded-strings.ts
    // covers the broader sweep; this keeps the accessibility attributes at zero.)
    const bad = scanAst((n) => {
      if (!ts.isJsxAttribute(n) || !/^(aria-label|aria-description|alt|placeholder|title)$/.test(n.name.getText())) return false;
      const init = n.initializer;
      return !!init && ts.isStringLiteral(init) && /[A-Za-z]{3}/.test(init.text);
    });
    ratchet('literalA11yAttributes', countBy(bad.map((b) => b.split(':')[0])), 'hardcoded accessibility strings');
  });
});

describe('ui: shared primitives', () => {
  it('modals and dialogs go through the shared <Modal>, never a hand-rolled role="dialog"', () => {
    const bad = scanLines(/role=["']dialog["']|aria-modal/, (m) => m.file === 'components/common/Modal.tsx');
    assert.deepEqual(bad, [], `Hand-rolled dialog:\n${bad.join('\n')}`);
  });

  it('no hand-rolled fixed full-screen overlays outside the shared Modal and spinner', () => {
    const bad = scanLines(/fixed inset-0[^"'`]*\bz-\d+/, (m) => /^components\/(common\/(Modal|DbdSpinner|ImagePreloadProvider)|layout\/)/.test(m.file));
    ratchet('handRolledOverlays', countBy(bad.map((b) => b.split(':')[0])), 'hand-rolled overlays');
  });

  it('tooltips use the shared Tooltip (tip()/<Tooltip>), not the native title attribute on elements', () => {
    const bad = scanAst((n) => ts.isJsxOpeningElement(n) && /^[a-z]/.test(n.tagName.getText()) && attrNames(n).includes('title'));
    assert.deepEqual(bad, [], `Native title tooltip:\n${bad.join('\n')}`);
  });
});

describe('ui: theming', () => {
  it('no fixed palette colours (white/black/slate/gray/zinc/neutral); use theme tokens so light, lemon and dark all work', () => {
    const bad = scanLines(/\b(text|bg|border|ring|fill|stroke|from|to|via)-(white|black|slate-\d+|gray-\d+|zinc-\d+|neutral-\d+|stone-\d+)\b/);
    assert.deepEqual(bad, [], `Theme-blind colour utilities:\n${bad.join('\n')}`);
  });
});

describe('ui: touch targets', () => {
  it('buttons smaller than 44px (h/w/size 1-10 in Tailwind) only shrink in number unless they extend their hit area', () => {
    // 44px = Tailwind 11. A small visual button is fine when a min-h/min-w or hit-area utility enlarges it.
    const bad = scanAst((n) => {
      if (!ts.isJsxOpeningElement(n) || n.tagName.getText() !== 'button') return false;
      const cls = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText() === 'className') as ts.JsxAttribute | undefined;
      const text = cls?.initializer ? cls.initializer.getText() : '';
      if (!/(^|[\s"'`{:])(h|w|size)-([1-9]|10)(\s|["'`}])/.test(text)) return false;
      return !/min-[hw]-\[?(4[4-9]|[5-9]\d)|min-[hw]-1[1-9]|hit-area|before:-inset|after:-inset|touch-target/.test(text);
    });
    ratchet('smallTouchTargets', countBy(bad.map((b) => b.split(':')[0])), 'sub-44px buttons');
  });
});
