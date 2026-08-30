'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud } from '@/utils/perkAudio';

export interface LootCrateStageProps {
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

type CratePhase = 'closed' | 'shaking' | 'open';

// Each ejected perk launches out and slightly to its own side (0/1 fly left,
// 2/3 fly right) before settling into its grid cell, selling "dropped out of
// the crate and landed" instead of a plain fade-up.
const EJECT_OFFSETS: { x: number; rotate: number }[] = [
  { x: -70, rotate: -18 },
  { x: -30, rotate: -8 },
  { x: 30, rotate: 8 },
  { x: 70, rotate: 18 },
];

export const LootCrateStage: React.FC<LootCrateStageProps> = ({
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
  const [phase, setPhase] = useState<CratePhase>('closed');
  const [revealedCrateSlots, setRevealedCrateSlots] = useState<DrawnSlot[]>([]);
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
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
      setRevealedCrateSlots([]);

      slots.forEach((slot, i) => {
        const revealTimeoutId = window.setTimeout(() => {
          playReelThud();
          setRevealedCrateSlots((prev) => [...prev, slot]);
          if (i === slots.length - 1) {
            celebrate(role, resultsRef.current);
            onRollComplete(slots);

            const resetTimeoutId = window.setTimeout(() => {
              setPhase('closed');
              setRevealedCrateSlots([]);
            }, 2400);
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
            ref={resultsRef}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {revealedCrateSlots.map((slot, idx) => {
              const { isObscured, onClick } = getSlotInteraction(
                idx,
                slot.perk,
                activeMutator,
                revealedSlots,
                onRevealSlot,
                onSelectPerk
              );
              const eject = EJECT_OFFSETS[idx] || EJECT_OFFSETS[0];

              return (
                <motion.div
                  key={idx}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: -110, x: eject.x, rotate: eject.rotate, scale: 0.5 }
                  }
                  animate={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 240, damping: 18 }}
                >
                  <PerkSlot
                    perk={slot.perk}
                    role={role}
                    page={slot.page}
                    slot={slot.slot}
                    size="large"
                    isObscured={isObscured}
                    isBlind={isBlind}
                    onClick={onClick}
                    dict={dict}
                  />
                </motion.div>
              );
            })}
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
