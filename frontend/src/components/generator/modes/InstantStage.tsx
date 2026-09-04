// frontend/src/components/generator/modes/InstantStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap } from 'lucide-react';
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
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
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
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="max-w-lg text-center text-sm font-semibold text-slate-700 dark:text-slate-300 sm:text-base">
        {dict?.generator?.instantRollPrompt ||
          'Rolls all four perks at once, instantly. Page and slot are decided the moment you click.'}
      </p>

      <DbdButton
        role={role}
        size="lg"
        onClick={handleRoll}
        disabled={activePlayablePerks.length === 0}
        icon={<Zap className="h-6 w-6" />}
      >
        {dict?.generator?.rollCompleteLoadout || `Roll Complete ${role} Loadout`}
      </DbdButton>

      {/* Always mounted at its final size, even before the first roll --
          empty and filled slots share the exact same footprint, so rolling
          never changes the stage's height (no jump, no reserved dead
          space when idle either). */}
      <div ref={resultsRef} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {flavorLine && (
        <div
          aria-live="polite"
          className="max-w-xs sm:max-w-md mx-auto px-3.5 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-xs sm:text-sm font-black text-amber-300 text-center shadow-md animate-fade-in break-words"
        >
          {flavorLine}
        </div>
      )}
    </div>
  );
};


