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

describe('App shell sidebar geometry', () => {
  const cssPath = path.resolve(__dirname, '../../app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines --sidebar-width CSS variable for responsive in-flow layout', () => {
    // Mobile root default: 0rem
    assert.match(cssContent, /--sidebar-width:\s*0rem/, ':root must set --sidebar-width: 0rem');
    // Desktop >= 1024px: 16rem
    assert.match(cssContent, /--sidebar-width:\s*16rem/, 'desktop must set --sidebar-width: 16rem');
    // Collapsed desktop: 0rem
    assert.match(
      cssContent,
      /:root\[data-sidebar="collapsed"\]\s*\{\s*--sidebar-width:\s*0rem;/,
      ':root[data-sidebar="collapsed"] must collapse --sidebar-width to 0rem'
    );
  });

  it('drives .lemon-shell-aside width via var(--sidebar-width) with smooth transition', () => {
    const asideBlock = cssContent.match(/\.lemon-shell-aside[^{]*\{[^}]*\}/g)?.join('\n') ?? '';
    assert.match(
      asideBlock,
      /width:\s*var\(--sidebar-width\)/,
      '.lemon-shell-aside must use width: var(--sidebar-width)'
    );
    assert.match(
      asideBlock,
      /transition:\s*width\s+300ms/,
      '.lemon-shell-aside must transition width over 300ms'
    );
  });
});
