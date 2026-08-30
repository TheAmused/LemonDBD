'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelThud, playCardFlip } from '@/utils/perkAudio';

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

type CratePhase = 'closed' | 'shaking' | 'scattering' | 'complete';

const LOADOUT_SIZE = 4;

interface ScatterItem extends DrawnSlot {
  id: string;
  rotate: number;
  jitterY: number;
}

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
  const [scatterPool, setScatterPool] = useState<ScatterItem[]>([]);
  const [selected, setSelected] = useState<DrawnSlot[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const handleOpen = () => {
    if (phase !== 'closed' || activePlayablePerks.length === 0) return;

    setPhase('shaking');

    const shakeTimeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) return;

      const throwCount = Math.min(activePlayablePerks.length, Math.floor(Math.random() * 5) + 8); // 8-12
      const picked = pickRandomLoadout(activePlayablePerks, activeMutator, throwCount);
      const drawn = buildDrawnSlots(picked, activePlayablePerks);
      const pool: ScatterItem[] = drawn.map((slot) => ({
        ...slot,
        id: slot.perk?.name || `${slot.page}-${slot.slot}`,
        rotate: (Math.random() - 0.5) * 24,
        jitterY: (Math.random() - 0.5) * 18,
      }));

      setScatterPool(pool);
      setSelected([]);
      setPhase('scattering');
    }, 700);
    timeoutsRef.current.push(shakeTimeoutId);
  };

  const handlePick = (item: ScatterItem) => {
    if (phase !== 'scattering') return;

    playCardFlip();

    const nextSelected = [...selected, { page: item.page, slot: item.slot, perk: item.perk }];

    // Remove the picked perk, then let the Entity claim 1-2 more at random
    // -- but never delete past what's still needed to finish the loadout,
    // and never past what's actually available.
    let remainingPool = scatterPool.filter((p) => p.id !== item.id);
    const stillNeeded = LOADOUT_SIZE - nextSelected.length;

    if (stillNeeded > 0 && remainingPool.length > 0) {
      const maxSafeDeletes = Math.max(0, remainingPool.length - stillNeeded);
      const deleteCount = Math.min(1 + (Math.random() < 0.5 ? 1 : 0), maxSafeDeletes);
      for (let i = 0; i < deleteCount; i++) {
        const idx = Math.floor(Math.random() * remainingPool.length);
        remainingPool = remainingPool.filter((_, pi) => pi !== idx);
      }
      if (deleteCount > 0) {
        const thudTimeoutId = window.setTimeout(() => playReelThud(), 150);
        timeoutsRef.current.push(thudTimeoutId);
      }
    }

    setSelected(nextSelected);
    setScatterPool(remainingPool);

    // Complete once the loadout is full, or if the Entity ran out of perks
    // to offer before that (only possible with a very small playable pool).
    if (nextSelected.length >= LOADOUT_SIZE || remainingPool.length === 0) {
      setPhase('complete');
      celebrate(role, resultsRef.current);
      onRollComplete(nextSelected);
    }
  };

  const handleReset = () => {
    setPhase('closed');
    setScatterPool([]);
    setSelected([]);
  };

  const scatterPrompt = (
    dict?.generator?.scatterPrompt ||
    'Pick one -- choosing it costs the Entity 1-2 of the others. {count}/4 locked in.'
  ).replace('{count}', String(selected.length));

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-10">
      {(phase === 'closed' || phase === 'shaking') && (
        <>
          <p className="text-xs font-bold text-slate-400 text-center">
            {dict?.generator?.cratePrompt || 'A Trial Offering awaits. Crack it open for your loadout.'}
          </p>
          <motion.button
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
                role === 'Survivor'
                  ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                  : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'
              }`}
            />
          </motion.button>
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
        </>
      )}

      {phase === 'scattering' && (
        <>
          <p aria-live="polite" className="text-xs font-bold text-slate-400 text-center max-w-md">
            {scatterPrompt}
          </p>

          <div className="grid w-full max-w-4xl grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <AnimatePresence>
              {scatterPool.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: -90, rotate: item.rotate, scale: 0.5 }}
                  animate={{ opacity: 1, y: item.jitterY, rotate: item.rotate, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: item.rotate + 40 }}
                  transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 20 }}
                >
                  {/* Full visibility during selection is deliberate: Blind
                      Mode and the Curse of Blindness only obscure the final
                      locked-in result grid below -- hiding the options here
                      would make "pick one" a meaningless coin flip. */}
                  <PerkSlot
                    perk={item.perk}
                    role={role}
                    page={item.page}
                    slot={item.slot}
                    onClick={() => handlePick(item)}
                    dict={dict}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {phase === 'complete' && (
        <>
          <p className="text-xs font-bold text-slate-400 text-center">
            {dict?.generator?.scatterComplete || 'Your loadout is locked in.'}
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
                  dict={dict}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-3 rounded-2xl px-8 py-4 font-black text-sm tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
              role === 'Survivor'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
                : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span>{dict?.generator?.crateOpenAnother || 'Crack Open Another'}</span>
          </button>
        </>
      )}

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
