// frontend/src/components/generator/modes/InstantStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DbdButton } from '../shared/DbdButton';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface InstantStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}

export const InstantStage: React.FC<InstantStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  dict,
  backendBase,
}) => {
  const [revealSlots, setRevealSlots] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { celebrate } = useJackpotCelebration();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      stopTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const handleRoll = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    // Pad to a fixed 4 so the grid always has exactly 4 cells even if
    // fewer than 4 perks were available to draw.
    setRevealSlots([0, 1, 2, 3].map((i) => slots[i] || null));

    slots.forEach((_, i) => {
      const timeoutId = window.setTimeout(() => playReelThud(), i * 150);
      stopTimeoutsRef.current.push(timeoutId);
    });

    const finalTimeoutId = window.setTimeout(() => {
      celebrate(role, resultsRef.current);
      onRollComplete(slots);
    }, slots.length * 150 + 200);
    stopTimeoutsRef.current.push(finalTimeoutId);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8">
      <p className="max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary">
        {dict?.generator?.instantRollPrompt ||
          'Rolls all four perks at once, instantly. Page and slot are decided the moment you click.'}
      </p>

      <DbdButton
        role={role}
        size="lg"
        onClick={handleRoll}
        disabled={activePlayablePerks.length === 0}
      >
        {dict?.generator?.rollCompleteLoadout || `Roll Complete ${role} Loadout`}
      </DbdButton>

      {/* Always mounted at its final size, even before the first roll --
          empty and filled slots share the exact same footprint, so rolling
          never changes the stage's height (no jump, no reserved dead
          space when idle either). */}
      <div ref={resultsRef} className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4 xl:gap-6 2xl:gap-8 wide:gap-10 wide-2k:gap-12 wide-4k:gap-16">
        {revealSlots.map((slot, i) => {
          const { isObscured, onClick } = getSlotInteraction(
            i,
            slot?.perk,
            activeMutator,
            revealedSlots,
            onRevealSlot,
            onSelectPerk
          );
          return (
            <motion.div
              key={i}
              initial={false}
              animate={slot ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
              transition={reduceMotion || !slot ? { duration: 0 } : { delay: i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            >
              <PerkSlot
                perk={slot?.perk}
                role={role}
                page={slot?.page}
                slot={slot?.slot}
                size="large"
                isObscured={isObscured}
                isBlind={isBlind}
                onClick={onClick}
                dict={dict}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};


