// frontend/src/__tests__/unit/themeColor.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { changelogHighlightColors, changelogTextColors } from '../../components/changelog/changelogTheme';
import { codeModules, SRC } from '../helpers/sourceGraph';
import { hexToRgba, paletteColor, themeColor, withAlpha } from '../../utils/themeColor';

describe('themeColor helpers', () => {
  it('withAlpha mixes the colour with transparent at the given strength', () => {
    assert.equal(withAlpha('var(--accent-red)', 0.35), 'color-mix(in srgb, var(--accent-red) 35%, transparent)');
  });

  it('withAlpha clamps the strength to 0..100%', () => {
    assert.equal(withAlpha('red', 2), 'color-mix(in srgb, red 100%, transparent)');
    assert.equal(withAlpha('red', -1), 'color-mix(in srgb, red 0%, transparent)');
  });

  it('hexToRgba writes #rrggbb as rgba text', () => {
    assert.equal(hexToRgba('#dc2626', 0.35), 'rgba(220,38,38,0.35)');
  });

  it('colour lookups are empty where there is no document to read', () => {
    assert.equal(themeColor('--accent-red'), '');
    assert.equal(paletteColor('red-600'), '');
  });
});

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
