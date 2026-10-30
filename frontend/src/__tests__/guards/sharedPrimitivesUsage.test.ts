// frontend/src/__tests__/guards/sharedPrimitivesUsage.test.ts
//
// Whole-tree rules for the shared primitives: tabs, popovers, native dialogs, the validation provider
// and the named sizes in tokens.css. (sharedPrimitivesSource.test.ts holds the older ones.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(e.name)) acc.push(full);
  }
  return acc;
}
const FILES = walk(SRC);

describe('shared primitives usage', () => {
  it('no component outside Tabs.tsx hand-rolls role="tab"', () => {
    const offenders = FILES.filter((f) => !f.endsWith(path.join('common', 'Tabs.tsx')))
      .filter((f) => /role=["']tab(list|panel)?["']/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    assert.deepEqual(offenders, []);
  });

  for (const file of ['components/character-detail/components/CategoryPicker.tsx', 'components/common/CustomDropdown.tsx']) {
    it(`${file} uses the shared Popover instead of its own portal`, () => {
      const src = read(file);
      assert.ok(!src.includes('createPortal') && !src.includes("from 'react-dom'"));
      assert.ok(src.includes('<Popover'));
    });
  }

  it('components/streaks/FreezeBadge.tsx uses the shared tooltip instead of its own portal', () => {
    const src = read('components/streaks/FreezeBadge.tsx');
    assert.ok(!src.includes('createPortal') && !src.includes("from 'react-dom'"));
    assert.ok(src.includes('tip('));
  });

  it('no native browser dialogs (alert / confirm / prompt) anywhere in the app', () => {
    const NATIVE = /(?<![\w.$])(?:window\.)?(?:alert|confirm|prompt)\s*\(/;
    const bad: string[] = [];
    for (const f of FILES) {
      fs.readFileSync(f, 'utf-8').split(/\r?\n/).forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        // `confirm()` as a local function (DeleteAccountSection) is fine: only window.* and bare alert/prompt are native.
        if (/window\.(alert|confirm|prompt)\s*\(/.test(code) || /(?<![\w.$])(alert|prompt)\s*\(/.test(code)) {
          if (NATIVE.test(code)) bad.push(`${path.relative(SRC, f)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        }
      });
    }
    assert.deepEqual(bad, [], `native browser dialogs found:\n${bad.join('\n')}`);
  });

  it('the locale layout mounts the validation provider (otherwise native bubbles come back)', () => {
    assert.match(read('app/[locale]/layout.tsx'), /<FormValidationProvider\s*\/>/);
  });

  it('tokens.css defines every named size the admin panel uses', () => {
    const tokens = read('app/styles/tokens.css');
    for (const name of ['--container-menu', '--container-field-sm', '--container-field', '--container-field-lg', '--container-cell', '--container-cell-lg', '--breakpoint-phone']) {
      assert.ok(tokens.includes(`${name}:`), name);
    }
    for (const util of ['icon-2xs', 'icon-xs', 'icon-sm', 'icon-md', 'icon-lg', 'icon-xl', 'max-h-list', 'max-h-roster', 'min-h-skeleton-tab', 'min-h-skeleton-page', 'grid-cols-field-suffix', 'grid-cols-label-wide', 'grid-cols-label-control', 'no-spinner']) {
      assert.ok(tokens.includes(`@utility ${util} `), util);
    }
  });
});
