// frontend/src/components/generator/modes/wheel/wheelSpin.ts
import type { Perk } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import { getPerkWeight } from '../../lib/perkPicker';

/** Picks the slot (1-based) the perk wheel will land on.
 *
 * Every mutator here is a soft probability adjustment -- never a hard
 * filter. Narrowing "allowed slots" down to only matching (or only
 * non-matching) perks turned an advertised "-90% chance" or "4x/5x
 * boosted chance" into the wheel landing on nothing else, ever (a
 * real bug that shipped here before). Instead, weight every slot on
 * the page via the same `getPerkWeight` used by the other draw modes
 * and pick among all of them, so the odds shift without anything
 * ever becoming truly impossible to land on.
 */
export function pickTargetSlot(
  pagePerksWithSlot: { slot: number; perk: Perk }[],
  maxSlotsOnPage: number,
  activeMutator: ChaosMutator | null
): number {
  if (pagePerksWithSlot.length === 0) return Math.floor(Math.random() * maxSlotsOnPage) + 1;

  const weights = pagePerksWithSlot.map((e) => getPerkWeight(e.perk, activeMutator));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return Math.floor(Math.random() * maxSlotsOnPage) + 1;

  let r = Math.random() * totalWeight;
  let chosenSlot = pagePerksWithSlot[0].slot;
  for (let i = 0; i < pagePerksWithSlot.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosenSlot = pagePerksWithSlot[i].slot;
      break;
    }
  }
  return chosenSlot;
}
