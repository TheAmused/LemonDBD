// frontend/src/__tests__/guards/siteConfigFlags.test.ts
//
// Every flag, limit and link GET /api/v1/site-config sends is there because an admin setting should
// change what the page does. Three of them were once parsed and then never read, so switching the
// setting changed nothing in the browser. This keeps each one read by at least one module.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SITE_CONFIG } from '@/services/siteConfig';

const SRC = path.resolve(__dirname, '../..');

function appSources(dir = SRC, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'locales') continue;
      appSources(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('public site config: every setting is used', () => {
  const files = appSources()
    .filter((file) => !/services[\\/]siteConfig\.ts$|types[\\/]siteConfig\.ts$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf-8'));

  for (const group of ['features', 'limits', 'links'] as const) {
    for (const key of Object.keys(DEFAULT_SITE_CONFIG[group])) {
      it(`${group}.${key} is read by the app`, () => {
        const pattern = new RegExp(`\\b${key}\\b`);
        assert.ok(files.some((text) => pattern.test(text)), `${group}.${key} is sent by the server but nothing reads it`);
      });
    }
  }
});
