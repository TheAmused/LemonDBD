// frontend/src/__tests__/unit/challengeCompletionTrophyRules.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  cascadeCompletedTiers,
  tierCompletionCount,
  isHardestTierCompleted,
  CHAOS_DIFFICULTY_ORDER,
  HISTORY_MODE_ORDER,
} from '@/utils/challengeTierCompletion';

// ---------------------------------------------------------------------------
// cascadeCompletedTiers — cascade logic
// ---------------------------------------------------------------------------

test('cascadeCompletedTiers — hell clears easy+medium for Chaos', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['hell']);
  assert.ok(result.has('easy'));
  assert.ok(result.has('medium'));
  assert.ok(result.has('hell'));
});

test('cascadeCompletedTiers — medium only clears easy for Chaos', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['medium']);
  assert.ok(result.has('easy'));
  assert.ok(result.has('medium'));
  assert.strictEqual(result.has('hell'), false);
});

test('cascadeCompletedTiers — easy alone clears only easy', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['easy']);
  assert.deepStrictEqual([...result], ['easy']);
});

test('cascadeCompletedTiers — hell clears medium for History', () => {
  const result = cascadeCompletedTiers(HISTORY_MODE_ORDER, ['hell']);
  assert.ok(result.has('medium'));
  assert.ok(result.has('hell'));
});

test('cascadeCompletedTiers — empty completed → empty set', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, []);
  assert.strictEqual(result.size, 0);
});

test('cascadeCompletedTiers — non-hardest tier does not unlock hardest', () => {
  const result = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['easy']);
  assert.strictEqual(result.has('hell'), false);
});

// ---------------------------------------------------------------------------
// isHardestTierCompleted
// ---------------------------------------------------------------------------

test('isHardestTierCompleted — hell is the hardest tier for Chaos', () => {
  assert.strictEqual(isHardestTierCompleted(CHAOS_DIFFICULTY_ORDER, ['hell']), true);
  assert.strictEqual(isHardestTierCompleted(CHAOS_DIFFICULTY_ORDER, ['medium']), false);
});

test('isHardestTierCompleted — hell is the hardest tier for History', () => {
  assert.strictEqual(isHardestTierCompleted(HISTORY_MODE_ORDER, ['hell']), true);
  assert.strictEqual(isHardestTierCompleted(HISTORY_MODE_ORDER, ['medium']), false);
});

// ---------------------------------------------------------------------------
// tierCompletionCount
// ---------------------------------------------------------------------------

test("tierCompletionCount — own count wins over inherited", () => {
  // hell cleared with 5, then medium directly cleared with 8
  // medium tile must show 8, not hell's stale 5
  const counts = { hell: 5, medium: 8 };
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, counts, 'medium'), 8);
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, counts, 'hell'), 5);
});

test('tierCompletionCount — falls back to nearest harder tier when own count absent', () => {
  // easy was never itself cleared; it inherits hell's count
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { hell: 6 }, 'easy'), 6);
  // medium is between easy and hell — nearest harder is medium, not hell
  assert.strictEqual(
    tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { medium: 5, hell: 6 }, 'easy'),
    5,
  );
});

test('tierCompletionCount — returns null when no count exists anywhere', () => {
  assert.strictEqual(tierCompletionCount(CHAOS_DIFFICULTY_ORDER, {}, 'easy'), null);
});

// ---------------------------------------------------------------------------
// Trophy color rules: yellow (any completion) vs red (full_roster)
// ---------------------------------------------------------------------------

test('trophy is yellow (any completion) when easy is cleared but hardest is not', () => {
  // Simulates a user who completed chaos/easy only.
  // The cascaded set proves they earned a yellow badge but not a red one.
  const cascaded = cascadeCompletedTiers(CHAOS_DIFFICULTY_ORDER, ['easy']);
  assert.ok(cascaded.has('easy'), 'easy badge should be visible (yellow)');
  assert.strictEqual(
    isHardestTierCompleted(CHAOS_DIFFICULTY_ORDER, ['easy']),
    false,
    'card-level trophy (red) must not appear',
  );
});

test('trophy turns red-eligible when hell is completed (isHardestTierCompleted → true)', () => {
  // User completed chaos/hell → card earns a trophy.
  // Whether it is yellow or red depends on full_roster from the API,
  // but the util correctly signals "hardest cleared".
  const completedVariants = ['hell'];
  assert.strictEqual(
    isHardestTierCompleted(CHAOS_DIFFICULTY_ORDER, completedVariants),
    true,
    'card-level trophy should be awarded',
  );
  // The count for the red badge comes from fullRosterCounts, same util:
  const fullRosterCounts = { hell: 10 };
  assert.strictEqual(
    tierCompletionCount(CHAOS_DIFFICULTY_ORDER, fullRosterCounts, 'hell'),
    10,
    'red badge count should match the full-roster count at hell completion',
  );
});

// ---------------------------------------------------------------------------
// Determinism — new characters during a run don't affect pure output
// ---------------------------------------------------------------------------

test('cascadeCompletedTiers is deterministic: same input always produces the same output', () => {
  const args: [readonly string[], string[]] = [CHAOS_DIFFICULTY_ORDER, ['medium']];
  const first = cascadeCompletedTiers(...args);
  const second = cascadeCompletedTiers(...args);
  assert.deepStrictEqual([...first].sort(), [...second].sort());
});

// ---------------------------------------------------------------------------
// Number next to trophy — unlocked_characters_count at completion time
// ---------------------------------------------------------------------------

test('number next to trophy reflects unlocked_characters_count at completion time', () => {
  // hell cleared with 42 characters unlocked
  assert.strictEqual(
    tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { hell: 42 }, 'hell'),
    42,
  );
  // easy and medium inherit from hell when they have no own count
  assert.strictEqual(
    tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { hell: 42 }, 'medium'),
    42,
    'medium inherits hell count when medium has no own completion',
  );
  // If medium was later directly cleared with a larger roster, it shows its own count
  assert.strictEqual(
    tierCompletionCount(CHAOS_DIFFICULTY_ORDER, { medium: 50, hell: 42 }, 'medium'),
    50,
    'medium own completion (50) wins over inherited hell count (42)',
  );
});
