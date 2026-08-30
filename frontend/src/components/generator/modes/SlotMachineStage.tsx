'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Rows3 } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelTick, playReelThud } from '@/utils/perkAudio';

export interface SlotMachineStageProps {
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

type ReelState = 'idle' | 'spinning' | 'stopped';

const REEL_STOP_DELAY_MS = 500;
const TICK_INTERVAL_MS = 90;

export const SlotMachineStage: React.FC<SlotMachineStageProps> = ({
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
  const [reelStates, setReelStates] = useState<ReelState[]>(['idle', 'idle', 'idle', 'idle']);
  const [displayedPerks, setDisplayedPerks] = useState<(Perk | null)[]>([null, null, null, null]);
  const finalSlotsRef = useRef<DrawnSlot[]>([]);
  const tickIntervalsRef = useRef<(ReturnType<typeof setInterval> | null)[]>([null, null, null, null]);
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      // Clear all intervals
      tickIntervalsRef.current.forEach((interval) => interval && clearInterval(interval));
      // Clear all timeouts
      stopTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const isSpinning = reelStates.some((s) => s === 'spinning');

  const handlePullLever = () => {
    if (isSpinning || activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    finalSlotsRef.current = slots;

    setReelStates((prev) =>
      prev.map((_, idx) => (idx < slots.length ? 'spinning' : 'idle'))
    );
    setDisplayedPerks((prev) =>
      prev.map((perk, idx) => (idx < slots.length ? perk : null))
    );

    slots.forEach((slot, reelIdx) => {
      tickIntervalsRef.current[reelIdx] = setInterval(() => {
        const randomPerk = activePlayablePerks[Math.floor(Math.random() * activePlayablePerks.length)];
        setDisplayedPerks((prev) => {
          const next = [...prev];
          next[reelIdx] = randomPerk;
          return next;
        });
        playReelTick(1 + reelIdx * 0.05);
      }, TICK_INTERVAL_MS);

      const stopTimeout = window.setTimeout(() => {
        const interval = tickIntervalsRef.current[reelIdx];
        if (interval) clearInterval(interval);

        setDisplayedPerks((prev) => {
          const next = [...prev];
          next[reelIdx] = slot.perk || null;
          return next;
        });
        setReelStates((prev) => {
          const next = [...prev];
          next[reelIdx] = 'stopped';
          return next;
        });
        playReelThud();

        if (reelIdx === slots.length - 1) {
          celebrate(role, resultsRef.current);
          onRollComplete(slots);
        }
      }, 1200 + reelIdx * REEL_STOP_DELAY_MS);

      // Track the timeout for cleanup on unmount
      stopTimeoutsRef.current.push(stopTimeout);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.slotMachinePrompt || 'Pull the lever for a full 4-perk loadout.'}
      </p>

      <div ref={resultsRef} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {displayedPerks.map((perk, idx) => {
          const stopped = reelStates[idx] === 'stopped';
          const interaction = stopped
            ? getSlotInteraction(idx, perk, activeMutator, revealedSlots, onRevealSlot, onSelectPerk)
            : undefined;

          return (
            <motion.div
              key={idx}
              animate={!reduceMotion && reelStates[idx] === 'spinning' ? { y: [0, -6, 0] } : { y: 0 }}
              transition={!reduceMotion && reelStates[idx] === 'spinning' ? { repeat: Infinity, duration: 0.15 } : {}}
            >
              <PerkSlot
                perk={perk}
                role={role}
                page={stopped ? finalSlotsRef.current[idx]?.page : undefined}
                slot={stopped ? finalSlotsRef.current[idx]?.slot : undefined}
                size="large"
                isObscured={interaction?.isObscured}
                isBlind={isBlind}
                onClick={interaction?.onClick}
                dict={dict}
              />
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handlePullLever}
        disabled={isSpinning || activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Rows3 className={`h-6 w-6 ${isSpinning && !reduceMotion ? 'animate-bounce' : ''}`} />
        <span>
          {isSpinning
            ? dict?.generator?.slotMachineSpinning || 'Reels Spinning...'
            : dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}
        </span>
      </button>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
