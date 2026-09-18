// frontend/src/__tests__/unit/smashOrPassShuffleFairness.test.ts
//
// Statistical fairness test for the Smash-or-Pass deck shuffle
// (utils/shuffleArray.ts), and the concrete bug it replaces.
//
// SmashOrPassHub.tsx used to shuffle the deck with
// `array.sort(() => Math.random() - 0.5)` in two places (initial deck load
// and the "Shuffle Remaining" button). That is not a shuffle: a random
// comparator violates `Array.prototype.sort`'s contract (the comparator is
// assumed transitive/stable), and depending on the engine's sort
// implementation this produces a measurably non-uniform permutation. The
// same class of bug the perk-randomizer session already found once
// (weighted logic that isn't actually what it claims to be), just in a
// different feature.
//
// Methodology: shuffle a small array (n=4) many times (20,000 trials) and
// tally which element ends up in position 0. A fair shuffle puts each of the
// 4 elements first with probability 1/4 = 25%, +/- a tight statistical
// tolerance. The broken sort-based approach is proven, in the same harness,
// to fall well outside that tolerance for at least one element -- so this
// test would have failed against the pre-fix code.
import test from 'node:test';
import assert from 'node:assert';
import { shuffleArray } from '@/utils/shuffleArray';

const TRIALS = 20000;
// Binomial std error at p=0.25, n=20000 is sqrt(0.25*0.75/20000) ≈ 0.31pp.
// A 3pp tolerance is ~10 std devs -- effectively zero flake risk while still
// catching any real bias.
const TOLERANCE_PP = 3;

function firstPositionFrequencies<T extends string>(items: T[], trials: number): Record<T, number> {
  const counts = Object.fromEntries(items.map((i) => [i, 0])) as Record<T, number>;
  for (let t = 0; t < trials; t++) {
    const shuffled = shuffleArray(items);
    counts[shuffled[0]] += 1;
  }
  return counts;
}

// The exact broken pattern the real code used to have, isolated here so the
// sanity test can prove it's actually biased without needing to import a
// React component (this repo has no component-rendering test harness).
function brokenSortShuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

test('shuffleArray: produces a uniform distribution over which element lands first', async (t) => {
  await t.test('4-element deck: every element is first ~25% of the time', () => {
    const items = ['a', 'b', 'c', 'd'];
    const counts = firstPositionFrequencies(items, TRIALS);
    for (const item of items) {
      const pct = (counts[item] / TRIALS) * 100;
      assert.ok(
        Math.abs(pct - 25) <= TOLERANCE_PP,
        `element '${item}' was first ${pct.toFixed(2)}% of the time, expected ~25% (+/-${TOLERANCE_PP}pp)`
      );
    }
  });

  await t.test('single-element array: returns that element, no crash', () => {
    assert.deepStrictEqual(shuffleArray(['only']), ['only']);
  });

  await t.test('empty array: returns empty array, no crash', () => {
    assert.deepStrictEqual(shuffleArray([]), []);
  });

  await t.test('does not mutate the input array', () => {
    const items = [1, 2, 3, 4, 5];
    const original = [...items];
    shuffleArray(items);
    assert.deepStrictEqual(items, original);
  });

  await t.test('preserves multiset of elements (no drops, no duplication)', () => {
    const items = ['smash', 'pass', 'super_smash', 'pass', 'smash'];
    const shuffled = shuffleArray(items);
    assert.deepStrictEqual([...shuffled].sort(), [...items].sort());
  });

  await t.test(
    'SANITY: the old sort(() => Math.random() - 0.5) pattern this replaces is measurably biased on the exact same harness',
    () => {
      const items = ['a', 'b', 'c', 'd'];
      const counts = Object.fromEntries(items.map((i) => [i, 0])) as Record<string, number>;
      for (let t2 = 0; t2 < TRIALS; t2++) {
        const shuffled = brokenSortShuffle(items);
        counts[shuffled[0]] += 1;
      }
      const pcts = items.map((i) => (counts[i] / TRIALS) * 100);
      const withinTolerance = pcts.every((pct) => Math.abs(pct - 25) <= TOLERANCE_PP);
      assert.strictEqual(
        withinTolerance,
        false,
        `expected the broken sort-based shuffle to be measurably non-uniform (outside +/-${TOLERANCE_PP}pp of 25%) ` +
          `for at least one element, but all positions were: ${pcts.map((p) => p.toFixed(2)).join(', ')}% -- ` +
          `if this fails, the sort-based approach may no longer be reliably distinguishable as biased on this ` +
          `engine/array size, which would undercut the case for shuffleArray existing at all`
      );
    }
  );
});
