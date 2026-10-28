// frontend/src/__tests__/guards/storageKeys.test.ts
//
// Browser-storage keys are declared once, in the module that owns them, so they cannot drift apart
// or collide: no other file types the literal key.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : filesUnder(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe('storage keys', () => {
  it('admin and moderation keys are only spelled out in components/admin/adminStorage.ts', () => {
    const owner = path.join(SRC, 'components/admin/adminStorage.ts');
    const offenders = filesUnder(SRC)
      .filter((f) => f !== owner)
      .filter((f) => /['"`]lemondbd_(admin|moderation)_/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    assert.deepEqual(offenders, []);
  });
});
