// frontend/src/components/generator/lib/blindnessCurse.ts
import { Perk } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';

export interface SlotInteraction {
  isObscured: boolean;
  onClick: () => void;
}

/**
 * Shared click/obscure behavior for a single result slot, used by every
 * draw mode's result grid (Wheel, Instant, Slot Machine, Tarot, Crate) so
 * behavior is identical everywhere instead of only living in one component:
 * under the "Curse of Blindness" mutator, an unrevealed slot with a perk is
 * a hidden button that reveals itself on first click; otherwise (or once
 * revealed) clicking opens the perk's detail modal via `onSelectPerk`.
 */
export function getSlotInteraction(
  idx: number,
  perk: Perk | null | undefined,
  activeMutator: ChaosMutator | null,
  revealedSlots: boolean[],
  onRevealSlot: (idx: number) => void,
  onSelectPerk: (perk: Perk) => void
): SlotInteraction {
  const isObscured = activeMutator?.id === 'blindness' && Boolean(perk) && !revealedSlots[idx];
  return {
    isObscured,
    onClick: () => {
      if (isObscured) {
        onRevealSlot(idx);
      } else if (perk) {
        onSelectPerk(perk);
      }
    },
  };
}
