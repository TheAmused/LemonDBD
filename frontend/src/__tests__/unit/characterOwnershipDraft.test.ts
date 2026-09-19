// frontend/src/__tests__/unit/characterOwnershipDraft.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  buildCharacterOwnershipDraft,
  changedCharacterUpdates,
  ownershipKey,
} from '@/utils/characterUtils';

const ROWS = [
  { id: 4, role: 'survivor', is_owned: false },
  { id: 4, role: 'killer', is_owned: true },
  { id: 12, role: 'survivor', is_owned: false },
];

test('the draft answers the same lookup the character grid makes', () => {
  const draft = buildCharacterOwnershipDraft(ROWS);

  assert.strictEqual(draft[ownershipKey(4, 'Survivor')], false);
  assert.strictEqual(draft[ownershipKey(12, 'Survivor')], false);
});

test('survivor 4 and killer 4 keep separate entries', () => {
  const draft = buildCharacterOwnershipDraft(ROWS);

  assert.strictEqual(draft[ownershipKey(4, 'Survivor')], false);
  assert.strictEqual(draft[ownershipKey(4, 'Killer')], true);
});

test('only characters whose state changed are sent, with their role', () => {
  const loaded = buildCharacterOwnershipDraft(ROWS);
  const draft = { ...loaded, [ownershipKey(12, 'Survivor')]: true };

  assert.deepStrictEqual(changedCharacterUpdates(loaded, draft), [
    { character_id: 12, role: 'survivor', is_owned: true },
  ]);
});

test('a character toggled twice is not sent', () => {
  const loaded = buildCharacterOwnershipDraft(ROWS);

  assert.deepStrictEqual(changedCharacterUpdates(loaded, { ...loaded }), []);
});

test('a character missing from the loaded state counts as owned', () => {
  const updates = changedCharacterUpdates({}, { [ownershipKey(7, 'Killer')]: false });

  assert.deepStrictEqual(updates, [{ character_id: 7, role: 'killer', is_owned: false }]);
});
