// frontend/src/utils/challengeTierCompletion.ts

/**
 * Beating a harder difficulty implies the easier ones too -- so clearing the
 * hardest tier in `order` marks every tier up to and including it as done.
 * `order` must run easiest to hardest, e.g. ['easy', 'medium', 'hell'].
 */
export function cascadeCompletedTiers(order: string[], completedVariants: string[]): Set<string> {
  const completedSet = new Set(completedVariants);
  let highestIndex = -1;
  order.forEach((tier, i) => {
    if (completedSet.has(tier)) highestIndex = Math.max(highestIndex, i);
  });

  const result = new Set<string>();
  for (let i = 0; i <= highestIndex; i++) result.add(order[i]);
  return result;
}
