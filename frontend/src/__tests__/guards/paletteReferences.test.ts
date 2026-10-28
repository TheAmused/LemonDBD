// frontend/src/__tests__/guards/paletteReferences.test.ts
//
// Every palette colour the code or the stylesheets name is defined in tokens.css.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { changelogHighlightColors, changelogTextColors } from '@/components/changelog/changelogTheme';
import { codeModules, SRC } from '../helpers/sourceGraph';

describe('palette references', () => {
  const css = fs.readFileSync(path.join(SRC, 'app/styles/tokens.css'), 'utf8');
  const defined = new Set([...css.matchAll(/--palette-([a-z0-9-]+):/g)].map((m) => m[1]));

  it('every palette name used in code or stylesheets is defined in tokens.css', () => {
    const used = new Map<string, string>();
    const note = (name: string, file: string) => used.has(name) || used.set(name, file);
    for (const m of codeModules()) {
      for (const hit of m.text.matchAll(/(?:paletteColor|tone|mix)\('([a-z0-9-]+)'/g)) note(hit[1], m.file);
      for (const hit of m.text.matchAll(/--palette-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) note(hit[1], m.file);
    }
    const styles = path.join(SRC, 'app/styles');
    for (const name of fs.readdirSync(styles).filter((n) => n.endsWith('.css') && n !== 'tokens.css')) {
      for (const hit of fs.readFileSync(path.join(styles, name), 'utf8').matchAll(/--palette-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) note(hit[1], name);
    }
    const missing = [...used].filter(([name]) => !defined.has(name)).map(([name, file]) => name + ' (' + file + ')');
    assert.deepEqual(missing, [], 'Palette colours used but not defined in tokens.css');
  });

  it('the changelog swatches only name palette colours that exist', () => {
    const asked: string[] = [];
    const record = (name: string) => (asked.push(name), '#000000');
    changelogTextColors(record);
    changelogHighlightColors(record);
    assert.deepEqual(asked.filter((name) => !defined.has(name)), []);
  });
});
