// frontend/src/__tests__/unit/perkPickerMalformedInputResilience.test.ts
//
// Adversarial/malformed input resilience for the perk-picker pipeline:
// a perk with no perk_types at all (old/incomplete seed data), a perk with
// an unrecognized perk type string, and pools where the curse-targeted
// category has zero eligible members after filtering -- confirming the
// documented fallback ("never return empty" / "fall back to the full
// pool") behaves correctly, with no crash and no infinite loop, and that
// it doesn't silently violate No-Repeat.
import test from 'node:test';
import assert from 'node:assert';
import {
  isExhaustionPerk,
  isHexOrBoonPerk,
  getPerkTarotType,
  pickPerkTarotType,
  getPerkWeight,
  filterPerksByMutator,
  pickRandomLoadout,
  computePlayablePool,
} from '@/components/generator/lib/perkPicker';
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

// `perk_types` may be anything the old/stale/garbage data could hold, so it is
// typed loosely here: undefined leaves the key off the object entirely, and a
// bare string is shorthand for a one-entry list.
function makePerk(name: string, perk_types?: unknown): Perk {
  const perk: any = { name, character: 'General', category: 'Survivor', description: '', icon_url: '', icon_local_path: '' };
  if (perk_types !== undefined) perk.perk_types = typeof perk_types === 'string' ? [perk_types] : perk_types;
  return perk as Perk;
}

function makeMutator(id: string): ChaosMutator {
  return { id, name: id, description: '', type: 'curse', icon: '', badgeBg: '', borderColor: '', textColor: '' };
}

test('a perk object with perk_types entirely absent (not even null -- old/incomplete data) is treated as the entity catch-all, never matches a specific category', () => {
  const perk = makePerk('Old Data Perk'); // perk_types key not present at all
  assert.strictEqual(isExhaustionPerk(perk), false);
  assert.strictEqual(isHexOrBoonPerk(perk), false);
  assert.strictEqual(getPerkWeight(perk, makeMutator('no_exhaustion')), 1.0);
});

test('a perk with perk_types explicitly null behaves identically to one with it absent', () => {
  const perk = makePerk('Null Perk Type', null);
  assert.strictEqual(isExhaustionPerk(perk), false);
  assert.strictEqual(getPerkWeight(perk, makeMutator('no_exhaustion')), 1.0);
});

test('a perk with an unknown/garbage perk type never matches any real category and never crashes any picker function', () => {
  const perk = makePerk('Garbage Perk', 'totally_not_a_real_category_xyz');
  assert.strictEqual(isExhaustionPerk(perk), false);
  assert.strictEqual(isHexOrBoonPerk(perk), false);
  assert.doesNotThrow(() => getPerkWeight(perk, makeMutator('hex_boon_only')));
  assert.strictEqual(getPerkWeight(perk, makeMutator('hex_boon_only')), 1.0);
});

test('pickRandomLoadout with a mix of missing/null/garbage perk_types perks alongside valid ones: never throws, always returns the requested count when available', () => {
  const pool = [
    makePerk('No Type At All'),
    makePerk('Null Type', null),
    makePerk('Garbage Type', 'nonsense'),
    makePerk('Real Exhaustion', 'exhaustion'),
    makePerk('Real General', 'general'),
  ];
  assert.doesNotThrow(() => {
    for (let i = 0; i < 200; i++) {
      const picked = pickRandomLoadout(pool, makeMutator('no_exhaustion'), 4);
      assert.strictEqual(picked.length, 4);
      assert.strictEqual(new Set(picked.map((p) => p.name)).size, 4); // pickRandomLoadout draws without replacement within one call
    }
  });
});

test('filterPerksByMutator: a curse whose target category has ZERO eligible members falls back to the full pool rather than returning empty', () => {
  const pool = [makePerk('A', 'general'), makePerk('B', 'general'), makePerk('C', 'general')];
  const result = filterPerksByMutator(pool, makeMutator('hex_boon_only')); // no hex/boon perks exist in this pool
  assert.strictEqual(result.length, 3, 'expected the documented fallback to the full unfiltered pool');
});

test('pickRandomLoadout on a pool where literally zero perks are eligible (empty pool): returns empty, does not throw, does not infinite-loop', () => {
  assert.doesNotThrow(() => {
    const picked = pickRandomLoadout([], makeMutator('no_exhaustion'), 4);
    assert.deepStrictEqual(picked, []);
  });
});

test('the zero-eligible-pool fallback does not secretly repeat under No-Repeat: computePlayablePool -> pickRandomLoadout composition still respects the drawn set until literally nothing remains', () => {
  const pool = [makePerk('X', 'exhaustion'), makePerk('Y', 'general')];
  const drawnSoFar = ['X'];
  const playable = computePlayablePool(pool, true, drawnSoFar);
  assert.strictEqual(playable.length, 1);
  assert.strictEqual(playable[0].name, 'Y');

  for (let i = 0; i < 50; i++) {
    const [picked] = pickRandomLoadout(playable, makeMutator('no_exhaustion'), 1);
    assert.strictEqual(picked.name, 'Y', 'must never draw X (already drawn) while a non-drawn perk remains');
  }
});

test('pickRandomLoadout requesting more perks than the pool has: returns exactly pool.length perks, all distinct, no crash', () => {
  const pool = [makePerk('A', 'general'), makePerk('B', 'general')];
  const picked = pickRandomLoadout(pool, null, 4);
  assert.strictEqual(picked.length, 2);
  assert.strictEqual(new Set(picked.map((p) => p.name)).size, 2);
});

test('perk_types in a shape the API never sends (empty list, a bare string, a number, a list of junk) reads as the entity catch-all and never crashes any picker function', () => {
  const shapes: unknown[] = [[], 'aura', 42, {}, [null, 7, {}], [undefined]];
  for (const shape of shapes) {
    const perk = makePerk('Odd Shape', undefined);
    (perk as any).perk_types = shape;

    assert.doesNotThrow(() => {
      isExhaustionPerk(perk);
      isHexOrBoonPerk(perk);
      getPerkWeight(perk, makeMutator('meme_loadout'));
      getPerkWeight(perk, makeMutator('blindness'));
      getPerkTarotType(perk);
      pickPerkTarotType(perk);
    }, `perk_types=${JSON.stringify(shape)} threw`);
    assert.strictEqual(isExhaustionPerk(perk), false);
  }
});

test('a mutator id inherited from Object.prototype ("toString", "constructor") is "no rule", not a crash', () => {
  const perk = makePerk('Any Perk', 'aura');
  assert.strictEqual(getPerkWeight(perk, makeMutator('toString')), 1.0);
  assert.strictEqual(getPerkWeight(perk, makeMutator('constructor')), 1.0);
  assert.strictEqual(getPerkWeight(perk, makeMutator('__proto__')), 1.0);
});
