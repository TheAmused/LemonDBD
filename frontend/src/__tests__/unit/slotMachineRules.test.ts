// frontend/src/__tests__/unit/slotMachineRules.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { getSelectionRange, SLOT_LOADOUT_SIZE, SLOT_TOTAL_CYCLES } from '@/components/generator/lib/slotMachineRules';

test('getSelectionRange: cycle 0 with nothing locked allows 0-2 (no pressure yet)', () => {
  const range = getSelectionRange(0, 0);
  assert.deepStrictEqual(range, { min: 0, max: 2 });
});

test('getSelectionRange: picking the minimum every cycle still reaches exactly 4 by the last cycle', () => {
  let locked = 0;
  for (let cycle = 0; cycle < SLOT_TOTAL_CYCLES; cycle++) {
    const range = getSelectionRange(locked, cycle);
    locked += range.min;
  }
  assert.strictEqual(locked, SLOT_LOADOUT_SIZE);
});

test('getSelectionRange: picking the maximum every cycle never exceeds 4 and finishes early', () => {
  let locked = 0;
  let cycle = 0;
  while (locked < SLOT_LOADOUT_SIZE && cycle < SLOT_TOTAL_CYCLES) {
    const range = getSelectionRange(locked, cycle);
    locked += range.max;
    cycle++;
  }
  assert.strictEqual(locked, SLOT_LOADOUT_SIZE);
  assert.ok(cycle <= SLOT_TOTAL_CYCLES, 'should never need more than the total allowed cycles');
});

test('getSelectionRange: forces exactly 2 on cycle 1 if the player picked 0 on cycle 0', () => {
  // cycle 0: needed=4, remainingCycles=3 -> min 0, max 2. Player picks 0.
  const cycle1Range = getSelectionRange(0, 1);
  // remainingCycles = 3-1 = 2, needed = 4 -> min = max(0, 4 - 2*1) = 2, max = min(2,4) = 2
  assert.deepStrictEqual(cycle1Range, { min: 2, max: 2 });
});

test('getSelectionRange: forces exactly 2 on the final cycle when 2 are reachably still needed', () => {
  // locked=2 entering the final cycle is a real reachable state (see the
  // exhaustive walk below) -- needed=2, remainingCycles=1, so both min and
  // max must land on exactly 2.
  const finalRange = getSelectionRange(2, 2);
  assert.deepStrictEqual(finalRange, { min: 2, max: 2 });
});

test('getSelectionRange: min never exceeds max across every reachable (locked, cycle) state', () => {
  // Exhaustively walk every combination of picks across all 3 cycles
  // (0, 1, or 2 picked each cycle, clamped to what's actually offered by
  // the range at that point) and assert the invariant holds everywhere.
  function walk(locked: number, cycle: number) {
    if (cycle >= SLOT_TOTAL_CYCLES || locked >= SLOT_LOADOUT_SIZE) return;
    const range = getSelectionRange(locked, cycle);
    assert.ok(
      range.min <= range.max,
      `min (${range.min}) > max (${range.max}) at locked=${locked}, cycle=${cycle}`
    );
    for (let pick = range.min; pick <= range.max; pick++) {
      walk(locked + pick, cycle + 1);
    }
  }
  walk(0, 0);
});

test('getSelectionRange: every reachable path ends with exactly 4 locked by the final cycle', () => {
  const finalCounts = new Set<number>();
  function walk(locked: number, cycle: number) {
    if (locked >= SLOT_LOADOUT_SIZE) {
      finalCounts.add(locked);
      return;
    }
    if (cycle >= SLOT_TOTAL_CYCLES) {
      finalCounts.add(locked); // should never happen if the invariant holds
      return;
    }
    const range = getSelectionRange(locked, cycle);
    for (let pick = range.min; pick <= range.max; pick++) {
      walk(locked + pick, cycle + 1);
    }
  }
  walk(0, 0);
  assert.deepStrictEqual([...finalCounts], [SLOT_LOADOUT_SIZE]);
});
