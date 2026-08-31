// frontend/src/components/generator/lib/slotMachineRules.ts

export const SLOT_LOADOUT_SIZE = 4;
export const SLOT_TOTAL_CYCLES = 3;

export interface SelectionRange {
  min: number;
  max: number;
}

/**
 * How many of the currently-unlocked reels the player must/may lock in a
 * given cycle.
 *
 * Every cycle before the last is purely optional: lock 0, 1, or 2 (never
 * more than 2 at once), with no minimum ever forced -- there's no need to,
 * because the final cycle is guaranteed to be able to absorb however much
 * got skipped.
 *
 * The final cycle is the one hard requirement: it's the last chance, so
 * whatever's still needed (up to the full SLOT_LOADOUT_SIZE of 4, if
 * nothing was locked in the first two cycles) must -- and may -- all be
 * locked in at once. min === max === needed there, uncapped by the
 * earlier 2-per-cycle limit.
 *
 * `cycleIndex` is 0-based (0, 1, 2 for a 3-cycle machine).
 */
export function getSelectionRange(lockedCount: number, cycleIndex: number): SelectionRange {
  const needed = SLOT_LOADOUT_SIZE - lockedCount;
  const remainingCycles = SLOT_TOTAL_CYCLES - cycleIndex;

  if (remainingCycles <= 1) {
    return { min: needed, max: needed };
  }

  return { min: 0, max: Math.min(2, needed) };
}
