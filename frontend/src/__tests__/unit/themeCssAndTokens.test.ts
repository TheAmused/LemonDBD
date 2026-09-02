import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Theme CSS & Fog Overlay Rules', () => {
  const cssPath = path.resolve(__dirname, '../../app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('dbd-fog-overlay uses background-image rather than background shorthand', () => {
    // Shorthand background: wipes background-color to transparent
    assert.ok(
      !cssContent.includes('.dbd-fog-overlay {\n  background: radial-gradient') &&
      !cssContent.includes('.dbd-fog-overlay {\r\n  background: radial-gradient'),
      'Must not use background: shorthand on .dbd-fog-overlay'
    );
    assert.ok(
      cssContent.includes('background-image: radial-gradient'),
      '.dbd-fog-overlay must use background-image'
    );
  });

  it('defines dark variant custom-variant for Tailwind v4', () => {
    assert.ok(cssContent.includes('@custom-variant dark'));
  });
});
