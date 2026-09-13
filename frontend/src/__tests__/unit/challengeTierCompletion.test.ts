// frontend/src/__tests__/unit/challengeTierCompletion.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  cascadeCompletedTiers,
  tierCompletionCount,
  isHardestTierCompleted,
  CHAOS_DIFFICULTY_ORDER,
  HISTORY_MODE_ORDER,
} from '@/utils/challengeTierCompletion';

test('cascadeCompletedTiers marks every easier tier once a harder one is cleared', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['medium']);
  assert.deepStrictEqual([...result].sort(), ['easy', 'medium']);
});

test('cascadeCompletedTiers returns an empty set when nothing is completed', () => {
  assert.strictEqual(cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, []).size, 0);
});

test('isHardestTierCompleted only looks at the last tier in order', () => {
  assert.strictEqual(isHardestTierCompleted(HISTORY_MODE_ORDER, ['medium']), false);
  assert.strictEqual(isHardestTierCompleted(HISTORY_MODE_ORDER, ['hell']), true);
});

test('tierCompletionCount prefers a tier\'s own completion over an inherited one', () => {
  // Regression: hell was cleared first (5 owned), medium was cleared later
  // with a bigger roster (8 owned) -- medium's tile must show 8, not 5.
  const counts = { hell: 5, medium: 8 };
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, counts, 'medium'), 8);
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, counts, 'hell'), 5);
});

test('tierCompletionCount falls back to the nearest harder tier with a count', () => {
  // Easy was never itself cleared with a full roster, only inherited from hell.
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { hell: 6 }, 'easy'), 6);
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { medium: 5, hell: 6 }, 'easy'), 5);
});

test('tierCompletionCount returns null when neither the tier nor a harder one has a count', () => {
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, {}, 'easy'), null);
});
