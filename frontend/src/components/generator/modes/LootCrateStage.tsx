'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface LootCrateStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

type CratePhase = 'closed' | 'shaking' | 'open';

export const LootCrateStage: React.FC<LootCrateStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [phase, setPhase] = useState<CratePhase>('closed');
  const [revealedSlots, setRevealedSlots] = useState<DrawnSlot[]>([]);
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      stopTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const handleOpen = () => {
    if (phase !== 'closed' || activePlayablePerks.length === 0) return;

    stopTimeoutsRef.current = [];

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);

    setPhase('shaking');

    const shakeTimeoutId = window.setTimeout(() => {
      setPhase('open');
      setRevealedSlots([]);

      slots.forEach((slot, i) => {
        const revealTimeoutId = window.setTimeout(() => {
          playReelThud();
          setRevealedSlots((prev) => [...prev, slot]);
          if (i === slots.length - 1) {
            celebrate(role);
            onRollComplete(slots);

            const resetTimeoutId = window.setTimeout(() => {
              setPhase('closed');
              setRevealedSlots([]);
            }, 1800);
            stopTimeoutsRef.current.push(resetTimeoutId);
          }
        }, i * 350);
        stopTimeoutsRef.current.push(revealTimeoutId);
      });
    }, 700);
    stopTimeoutsRef.current.push(shakeTimeoutId);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.cratePrompt || 'A Trial Offering awaits. Crack it open for your loadout.'}
      </p>

      <AnimatePresence mode="wait">
        {phase !== 'open' ? (
          <motion.button
            key="crate"
            type="button"
            onClick={handleOpen}
            disabled={phase === 'shaking' || activePlayablePerks.length === 0}
            animate={
              !reduceMotion && phase === 'shaking'
                ? { rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.05, 0.95, 1.05, 0.95, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={{ duration: reduceMotion ? 0 : 0.7 }}
            className="cursor-pointer disabled:cursor-default"
          >
            <Gift
              className={`h-28 w-28 ${
                role === 'Survivor' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
              }`}
            />
          </motion.button>
        ) : (
          <motion.div
            key="results"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.4 }}
          >
            {revealedSlots.map((slot, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, y: -30, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20 }}
              >
                <PerkSlot
                  perk={slot.perk}
                  role={role}
                  slotNumber={(slot.page - 1) * 15 + slot.slot}
                  dict={dict}
                  backendBase={backendBase}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'closed' && (
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          {dict?.generator?.crateTapToOpen || 'Tap the Trial Offering'}
        </p>
      )}
      {phase === 'shaking' && (
        <p aria-live="polite" className="text-xs font-black uppercase tracking-wide text-amber-400 animate-pulse">
          {dict?.generator?.crateOpening || 'Cracking Open...'}
        </p>
      )}

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
