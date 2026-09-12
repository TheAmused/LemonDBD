// frontend/src/utils/challengeTierCompletion.ts

/** Easiest to hardest. The last entry is what "fully cleared this mode" means
 *  for the card-level trophy -- never hardcode a difficulty name elsewhere. */
export const CHAOS_DIFFICULTY_ORDER = ['easy', 'medium', 'hell'] as const;
export const HISTORY_MODE_ORDER = ['medium', 'hell'] as const;

/**
 * Beating a harder difficulty implies the easier ones too -- so clearing the
 * hardest tier in `order` marks every tier up to and including it as done.
 * `order` must run easiest to hardest, e.g. ['easy', 'medium', 'hell'].
 */
export function cascadeCompletedTiers(order: readonly string[], completedVariants: string[]): Set<string> {
  const completedSet = new Set(completedVariants);
  let highestIndex = -1;
  order.forEach((tier, i) => {
    if (completedSet.has(tier)) highestIndex = Math.max(highestIndex, i);
  });

  const result = new Set<string>();
  for (let i = 0; i <= highestIndex; i++) result.add(order[i]);
  return result;
}

/** Whether the hardest (last) tier in `order` has been completed -- this is
 *  what earns the challenge card its trophy, not just any tier. */
export function isHardestTierCompleted(order: readonly string[], completedVariants: string[]): boolean {
  return completedVariants.includes(order[order.length - 1]);
}
