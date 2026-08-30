// frontend/src/components/generator/lib/slotMachineRules.ts

export const SLOT_LOADOUT_SIZE = 4;
export const SLOT_TOTAL_CYCLES = 3;

export interface SelectionRange {
  min: number;
  max: number;
}

/**
 * How many of the currently-unlocked reels the player must/may lock in a
 * given cycle. Guarantees exactly SLOT_LOADOUT_SIZE locked by the end of
 * cycle SLOT_TOTAL_CYCLES no matter what they pick along the way: `min`
 * forces enough to still be reachable in the cycles left, `max` never lets
 * them lock more than actually needed (and never more than 2 at once).
 *
 * `cycleIndex` is 0-based (0, 1, 2 for a 3-cycle machine).
 */
export function getSelectionRange(lockedCount: number, cycleIndex: number): SelectionRange {
  const needed = SLOT_LOADOUT_SIZE - lockedCount;
  const remainingCycles = SLOT_TOTAL_CYCLES - cycleIndex;
  const min = Math.max(0, needed - 2 * (remainingCycles - 1));
  const max = Math.min(2, needed);
  return { min, max };
}
