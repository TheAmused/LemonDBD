// frontend/src/__tests__/unit/userModerationStaleGuard.test.ts
// The moderation drawer never shows one account's history (and suggested sanction) for another.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const hook = readFileSync(path.join(__dirname, '../../components/admin/useUserModeration.ts'), 'utf8');

test('a late answer for a previous account is dropped', () => {
  assert.match(hook, /const request = \+\+latestRequest\.current/);
  assert.match(hook, /if \(request === latestRequest\.current\) setLoaded\(\{ userId, data: body \}\)/);
});

test('what is shown is keyed by the account it was loaded for', () => {
  assert.match(hook, /loaded && loaded\.userId === userId \? loaded\.data : null/);
});
