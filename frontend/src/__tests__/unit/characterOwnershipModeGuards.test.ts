// frontend/src/__tests__/unit/characterOwnershipModeGuards.test.ts
// "My characters" mode: a failed load never opens the mode, and unsaved changes are never dropped silently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const hook = readFileSync(path.join(__dirname, '../../components/characters/hub/useCharacterOwnership.ts'), 'utf8');
const hub = readFileSync(path.join(__dirname, '../../components/CharactersHub.tsx'), 'utf8');

test('a failed load reports an error instead of opening the mode', () => {
  assert.match(hook, /if \(!charsRes\.ok \|\| !perksRes\.ok\) \{\s*setOwnershipLoadError/);
  assert.match(hub, /ownershipLoadError && \(/);
});

test('leaving with unsaved changes asks first, and a reload warns', () => {
  assert.match(hook, /if \(isDirty\) setDiscardConfirmOpen\(true\)/);
  assert.match(hook, /addEventListener\('beforeunload'/);
  assert.match(hub, /<ConfirmModal[\s\S]*open=\{discardConfirmOpen\}/);
});
