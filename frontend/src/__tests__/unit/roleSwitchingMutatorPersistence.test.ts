// frontend/src/__tests__/unit/roleSwitchingMutatorPersistence.test.ts
//
// Role-switching behavior for the active Chaos Mutator and drawn-perk
// memory, exercised through the same per-role storage keys GeneratorPage's
// role-change effect (`getActiveMutatorForRole` / `saveActiveMutatorForRole`)
// actually uses -- a full switch-away-and-back round trip, the no-curse
// case, and corrupted storage isolated to one role.
import test from 'node:test';
import assert from 'node:assert';
import {
  getActiveMutatorForRole,
  saveActiveMutatorForRole,
  getDrawnPerksForRole,
  saveDrawnPerksForRole,
} from '@/components/generator/lib/generatorStorage';
import type { ChaosMutator } from '@/types/chaos';

function makeMutator(id: string): ChaosMutator {
  return { id, name: id, description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
}

function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

function resetStorage() {
  globalThis.localStorage = createMockLocalStorage() as unknown as Storage;
}

test('a Survivor curse persists across a Survivor -> Killer -> Survivor round trip', () => {
  resetStorage();
  const survivorCurse = makeMutator('no_exhaustion');
  saveActiveMutatorForRole('Survivor', survivorCurse);

  // Switch to Killer: reading Killer's own slot must not see the Survivor curse.
  assert.strictEqual(getActiveMutatorForRole('Killer'), null);

  // Set a different curse for Killer while we're there.
  const killerCurse = makeMutator('chase_only');
  saveActiveMutatorForRole('Killer', killerCurse);

  // Switch back to Survivor: the original curse must still be exactly what was set.
  const backOnSurvivor = getActiveMutatorForRole('Survivor');
  assert.strictEqual(backOnSurvivor?.id, 'no_exhaustion');

  // And Killer's own curse, set independently, must also still be intact.
  assert.strictEqual(getActiveMutatorForRole('Killer')?.id, 'chase_only');
});

test('switching role with no curse active on either side: both read back null, no crash, nothing invented', () => {
  resetStorage();
  assert.strictEqual(getActiveMutatorForRole('Survivor'), null);
  assert.strictEqual(getActiveMutatorForRole('Killer'), null);
});

test('clearing the curse on one role (saveActiveMutatorForRole(role, null)) does not affect the other role\'s curse', () => {
  resetStorage();
  saveActiveMutatorForRole('Survivor', makeMutator('solo_queue'));
  saveActiveMutatorForRole('Killer', makeMutator('no_slowdown'));

  saveActiveMutatorForRole('Survivor', null);

  assert.strictEqual(getActiveMutatorForRole('Survivor'), null);
  assert.strictEqual(getActiveMutatorForRole('Killer')?.id, 'no_slowdown');
});

test('corrupted localStorage for Survivor\'s mutator slot does not affect Killer\'s, and degrades to null rather than crashing', () => {
  resetStorage();
  saveActiveMutatorForRole('Killer', makeMutator('hex_roulette'));
  globalThis.localStorage.setItem('lemon_active_mutator_Survivor', '{not valid json');

  assert.strictEqual(getActiveMutatorForRole('Survivor'), null);
  assert.strictEqual(getActiveMutatorForRole('Killer')?.id, 'hex_roulette');
});

test('a mutator object missing its `id` field is treated as absent (getActiveMutatorForRole degrades gracefully)', () => {
  resetStorage();
  globalThis.localStorage.setItem('lemon_active_mutator_Survivor', JSON.stringify({ name: 'No id here' }));
  assert.strictEqual(getActiveMutatorForRole('Survivor'), null);
});

test('drawn-perk memory is role-isolated across a full switch round trip too', () => {
  resetStorage();
  saveDrawnPerksForRole('Survivor', ['Sprint Burst', 'Adrenaline']);
  saveDrawnPerksForRole('Killer', ['Hex: Ruin']);

  assert.deepStrictEqual(getDrawnPerksForRole('Killer'), ['Hex: Ruin']);
  saveDrawnPerksForRole('Killer', [...getDrawnPerksForRole('Killer'), 'Sloppy Butcher']);

  assert.deepStrictEqual(getDrawnPerksForRole('Survivor'), ['Sprint Burst', 'Adrenaline']);
  assert.deepStrictEqual(getDrawnPerksForRole('Killer'), ['Hex: Ruin', 'Sloppy Butcher']);
});

test('corrupted localStorage for one role\'s drawn-perks slot does not affect the other role\'s', () => {
  resetStorage();
  saveDrawnPerksForRole('Survivor', ['Sprint Burst']);
  globalThis.localStorage.setItem('lemon_drawn_perks_Killer', '"not an array"');

  assert.deepStrictEqual(getDrawnPerksForRole('Killer'), []);
  assert.deepStrictEqual(getDrawnPerksForRole('Survivor'), ['Sprint Burst']);
});
