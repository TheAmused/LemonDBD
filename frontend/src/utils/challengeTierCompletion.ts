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

/**
 * The killer count to show on `tier`'s own badge (works for both the gold
 * "any completion" count and the red "full roster" one -- pass the matching
 * counts map): its own completion if it has one (e.g. medium was directly
 * cleared with 8 owned), otherwise the nearest harder tier's count it
 * inherited "done" from via `cascadeCompletedTiers` (e.g. easy was never
 * cleared on its own, but hell was, with 5). A tier's own completion always
 * wins over an inherited one, even if it happened after and with a
 * different (larger) roster size -- inheriting hell's stale count onto a
 * separately-recompleted medium would show the wrong number.
 */
export function tierCompletionCount(
  order: readonly string[],
  counts: Record<string, number>,
  tier: string
): number | null {
  if (tier in counts) return counts[tier];
  const tierIndex = order.indexOf(tier);
  for (let i = tierIndex + 1; i < order.length; i++) {
    if (order[i] in counts) return counts[order[i]];
  }
  return null;
}
