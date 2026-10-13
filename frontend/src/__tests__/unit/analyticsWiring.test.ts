// frontend/src/__tests__/unit/analyticsWiring.test.ts
//
// Every event in the AnalyticsEvents catalogue is sent from somewhere, and nothing sends an
// event the catalogue does not know.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const catalogue = fs.readFileSync(path.join(SRC, 'utils/analytics.ts'), 'utf8');
// Only the event lines of the interface are indented exactly two spaces and end in a colon.
const declared = [...catalogue.matchAll(/^ {2}([a-z0-9_]+): /gm)].map((m) => m[1]);

const sources = walk(SRC)
  .filter((f) => !f.endsWith(path.join('utils', 'analytics.ts')))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const sent = new Set([
  ...[...sources.matchAll(/trackEvent\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
  ...[...sources.matchAll(/trackOnce\([^,]+,\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
]);

describe('analytics wiring', () => {
  it('declares the events it should', () => {
    assert.ok(declared.length >= 29, `only ${declared.length} events parsed from the catalogue`);
  });

  it('sends every event in the catalogue', () => {
    assert.deepEqual(declared.filter((n) => !sent.has(n)), []);
  });

  it('sends no event that is not in the catalogue', () => {
    assert.deepEqual([...sent].filter((n) => !declared.includes(n)), []);
  });

  it('never writes an em dash in the analytics module', () => {
    assert.equal(catalogue.includes('—'), false);
  });
});
