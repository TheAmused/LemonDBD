// frontend/src/__tests__/unit/theme/themeColor.test.ts
// (That every palette name used is defined in tokens.css is guards/paletteReferences.test.ts.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgba, paletteColor, themeColor, withAlpha } from '../../../utils/themeColor';

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
