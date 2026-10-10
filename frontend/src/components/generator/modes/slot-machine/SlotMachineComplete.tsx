'use client';
// frontend/src/components/generator/modes/slot-machine/SlotMachineComplete.tsx
import React from 'react';
import type { RefObject } from 'react';
import type { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import { useDictionary } from '@/context/DictionaryContext';
import { getSlotInteraction } from '../../lib/blindnessCurse';
import { PerkSlot } from '../../shared/PerkSlot';
import { DbdButton } from '../../shared/DbdButton';

interface SlotMachineCompleteProps {
  role: RoleCategory;
  selected: DrawnSlot[];
  activeMutator: ChaosMutator | null;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind: boolean;
  resultsRef: RefObject<HTMLDivElement | null>;
  onReset: () => void;
}

/** The finished loadout, and a button to go straight into a new pull. */
export function SlotMachineComplete({
  role,
  selected,
  activeMutator,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind,
  resultsRef,
  onReset,
}: SlotMachineCompleteProps) {
  const dict = useDictionary();

  return (
    <>
      <p className="text-sm font-bold text-text-secondary text-center sm:text-base">
        {dict.generator.scatterComplete}
      </p>
      <div ref={resultsRef} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {selected.map((slot, idx) => {
          const { isObscured, onClick } = getSlotInteraction(
            idx,
            slot.perk,
            activeMutator,
            revealedSlots,
            onRevealSlot,
            onSelectPerk
          );
          return (
            <PerkSlot
              key={idx}
              perk={slot.perk}
              role={role}
              page={slot.page}
              slot={slot.slot}
              size="large"
              isObscured={isObscured}
              isBlind={isBlind}
              onClick={onClick}
            />
          );
        })}
      </div>
      <DbdButton
        role={role}
        size="md"
        onClick={onReset}
      >
        {dict.generator.slotMachineSpinButton}
      </DbdButton>
    </>
  );
}
