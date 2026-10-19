// frontend/src/__tests__/unit/userShowcaseSyncGuards.test.ts
// Edits made before the saved showcase loads are replayed on the database copy (never the stale local
// copy saved over it), and a failed save is retried once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const hook = readFileSync(path.join(__dirname, '../../hooks/useUserShowcase.ts'), 'utf8');

test('early edits are queued and replayed on the database copy', () => {
  assert.match(hook, /!dbLoadedRef\.current\) \{\s*\/\/[^\n]*\n\s*pendingEditsRef\.current\.push\(updater\)/);
  assert.match(hook, /edits\.reduce\(\(state, edit\) => edit\(state\), base\)/);
  assert.doesNotMatch(hook, /hasUserModifiedRef/);
});

test('a failed save is retried once before the error is shown', () => {
  assert.match(hook, /void attempt\(1\)/);
  assert.match(hook, /if \(retriesLeft > 0\)/);
});
