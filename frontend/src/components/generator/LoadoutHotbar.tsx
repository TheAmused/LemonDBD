'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DrawnSlot, RoleCategory, Perk, GeneratorMode } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { PerkSlot } from './shared/PerkSlot';

export interface LoadoutHotbarProps {
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  /** The active-slot highlight only makes sense for Wheel, which fills one
   * slot per spin — every other mode fills all 4 at once. */
  genMode: GeneratorMode;
  role: RoleCategory;
  activeMutator: ChaosMutator | null;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  dict?: Dictionary;
}

export const LoadoutHotbar: React.FC<LoadoutHotbarProps> = ({
  loadout,
  activeSlotIdx,
  genMode,
  role,
  activeMutator,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  dict,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="region"
      aria-label={dict?.generator?.activeLoadoutTitle || 'Active 4-Perk Loadout'}
      className="sticky bottom-3 z-30 grid grid-cols-2 gap-2 rounded-3xl bg-slate-950/70 p-2.5 shadow-2xl backdrop-blur-xl sm:grid-cols-4"
    >
      {loadout.map((slotData, idx) => {
        const perk = slotData?.perk;
        const isObscured = activeMutator?.id === 'blindness' && Boolean(perk) && !revealedSlots[idx];

        return (
          <motion.div
            key={idx}
            layout
            initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 24 }}
          >
            <PerkSlot
              perk={perk}
              role={role}
              page={slotData?.page}
              slot={slotData?.slot}
              isObscured={isObscured}
              isActive={genMode === 'wheel' && activeSlotIdx === idx}
              announce
              onClick={() => {
                if (isObscured) {
                  onRevealSlot(idx);
                } else if (perk) {
                  onSelectPerk(perk);
                }
              }}
              dict={dict}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
