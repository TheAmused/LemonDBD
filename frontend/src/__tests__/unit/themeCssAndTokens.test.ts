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

  it('dbd-heartbeat-vignette--static defines static background, animation: none, and theme-aware opacities', () => {
    assert.match(
      cssContent,
      /\.dbd-heartbeat-vignette--static\s*\{[^}]*background:\s*radial-gradient\(ellipse at center,\s*transparent 55%,\s*var\(--accent-red\)\s*100%\);/,
      'Must define radial-gradient background on .dbd-heartbeat-vignette--static'
    );
    assert.match(
      cssContent,
      /\.dbd-heartbeat-vignette--static\s*\{[^}]*animation:\s*none;/,
      'Must define animation: none on .dbd-heartbeat-vignette--static'
    );
    assert.match(
      cssContent,
      /\.dbd-heartbeat-vignette--static\s*\{[^}]*opacity:\s*0\.12;/,
      'Must define light mode opacity: 0.12 on .dbd-heartbeat-vignette--static'
    );
    assert.match(
      cssContent,
      /\.dark\s+\.dbd-heartbeat-vignette--static\s*\{[^}]*opacity:\s*0\.4;/,
      'Must define dark mode opacity: 0.4 on .dark .dbd-heartbeat-vignette--static'
    );
    assert.match(
      cssContent,
      /\.dbd-heartbeat-vignette--static\s*\{[^}]*transition:\s*opacity 150ms ease-in-out;/,
      'Must define transition: opacity 150ms ease-in-out on .dbd-heartbeat-vignette--static'
    );
  });
});
