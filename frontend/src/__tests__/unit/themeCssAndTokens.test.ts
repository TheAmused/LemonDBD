// frontend/src/__tests__/unit/themeCssAndTokens.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Theme CSS & Fog Overlay Rules', () => {
  const cssPath = path.resolve(__dirname, '../../app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('dbd-fog-overlay uses background-image rather than background shorthand', () => {
    // Ensure shorthand background: is not used in either base or dark overlay rules
    assert.doesNotMatch(
      cssContent,
      /(?:\.dark\s+)?\.dbd-fog-overlay\s*\{[^}]*\bbackground\s*:/,
      'Must not use background: shorthand on .dbd-fog-overlay or .dark .dbd-fog-overlay'
    );

    // Ensure background-image is explicitly used in both rules
    assert.match(
      cssContent,
      /\.dbd-fog-overlay\s*\{[^}]*background-image:\s*radial-gradient/,
      '.dbd-fog-overlay must use background-image'
    );
    assert.match(
      cssContent,
      /\.dark\s+\.dbd-fog-overlay\s*\{[^}]*background-image:\s*radial-gradient/,
      '.dark .dbd-fog-overlay must use background-image'
    );

    // Token assertions
    assert.match(
      cssContent,
      /rgba\((?:100,\s*116,\s*139|15,\s*23,\s*42),\s*0\.05\)/,
      'Must include light mode fog mist token'
    );
    assert.match(cssContent, /rgba\(220,\s*38,\s*38,\s*0\.06\)/, 'Must include dark mode crimson aura token');
  });

  it('defines dark variant custom-variant for Tailwind v4', () => {
    assert.ok(
      cssContent.includes('@variant dark') || cssContent.includes('@custom-variant dark'),
      'Must define dark variant in Tailwind v4'
    );
  });

  it('dbd-heartbeat-vignette--static (red corner glow) has been removed', () => {
    assert.doesNotMatch(
      cssContent,
      /\.dbd-heartbeat-vignette--static/,
      'Must not define .dbd-heartbeat-vignette--static -- the red corner glow was removed'
    );
  });

  it('dbd-ambient-mist--killer (red top mist) has been removed', () => {
    assert.doesNotMatch(
      cssContent,
      /\.dbd-ambient-mist--killer/,
      'Must not define .dbd-ambient-mist--killer -- the red top mist was removed'
    );
  });
});

describe('App shell sidebar gutter', () => {
  const cssPath = path.resolve(__dirname, '../../app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('reserves sidebar space on .lemon-shell-main with margin-left, not padding-left', () => {
    // padding-left here would replace (not add to) the left component of a
    // page's own p-N utility on the same element, leaving content flush
    // against the sidebar with no gutter while the other three sides keep
    // theirs -- margin and padding are independent properties, so only
    // margin-left stacks correctly with a page's own padding.
    const shellMainBlock = cssContent.match(/\.lemon-shell-main[^{]*\{[^}]*\}/g)?.join('\n') ?? '';
    assert.match(shellMainBlock, /margin-left:\s*16rem/, '.lemon-shell-main must set margin-left: 16rem');
    assert.doesNotMatch(
      shellMainBlock,
      /padding-left/,
      '.lemon-shell-main must not use padding-left for sidebar clearance'
    );
  });
});
