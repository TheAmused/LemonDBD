'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface InstantStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

export const InstantStage: React.FC<InstantStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [revealSlots, setRevealSlots] = useState<DrawnSlot[] | null>(null);
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
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
    setRevealSlots(slots);

    slots.forEach((_, i) => {
      const timeoutId = window.setTimeout(() => playReelThud(), i * 150);
      stopTimeoutsRef.current.push(timeoutId);
    });

    const finalTimeoutId = window.setTimeout(() => {
      celebrate(role);
      onRollComplete(slots);
    }, slots.length * 150 + 200);
    stopTimeoutsRef.current.push(finalTimeoutId);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <button
        type="button"
        onClick={handleRoll}
        disabled={activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Zap className="h-6 w-6" />
        <span>{dict?.generator?.rollCompleteLoadout || `Roll Complete ${role} Loadout`}</span>
      </button>

      <AnimatePresence>
        {revealSlots && (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.15 } } }}
          >
            {revealSlots.map((slot, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.85 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={reduceMotion ? { duration: 0 } : undefined}
              >
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  page={slot.page}
                  slot={slot.slot}
                  dict={dict}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
