// frontend/src/__tests__/unit/characterOwnershipOverlay.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';

test('CharacterOwnershipOverlay is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOwnershipOverlay, 'function');
});
