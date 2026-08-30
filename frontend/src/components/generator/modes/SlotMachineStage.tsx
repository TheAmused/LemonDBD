'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Rows3, Lock, Sparkles } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { getSelectionRange, SLOT_LOADOUT_SIZE } from '../lib/slotMachineRules';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelTick, playReelThud } from '@/utils/perkAudio';
import { cn } from '@/utils/cn';

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

type MachinePhase = 'idle' | 'spinning' | 'awaiting' | 'complete';

interface Reel {
  id: number;
  perk: Perk | null;
  locked: boolean;
}

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
  const [phase, setPhase] = useState<MachinePhase>('idle');
  const [reels, setReels] = useState<Reel[]>([]);
  const [spinningIds, setSpinningIds] = useState<Set<number>>(new Set());
  const [staged, setStaged] = useState<Set<number>>(new Set());
  const [cycleIndex, setCycleIndex] = useState(0);
  const [selected, setSelected] = useState<DrawnSlot[]>([]);

  const tickIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const stopTimeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      tickIntervalsRef.current.forEach((interval) => clearInterval(interval));
      stopTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const spinReels = (ids: number[], finalPerks: Map<number, Perk | null>, onAllDone: () => void) => {
    setSpinningIds(new Set(ids));
    let doneCount = 0;

    ids.forEach((id, i) => {
      const interval = setInterval(() => {
        const randomPerk = activePlayablePerks[Math.floor(Math.random() * activePlayablePerks.length)];
        setReels((prev) => prev.map((r) => (r.id === id ? { ...r, perk: randomPerk } : r)));
        playReelTick(1 + i * 0.03);
      }, TICK_INTERVAL_MS);
      tickIntervalsRef.current.set(id, interval);

      const stopTimeout = window.setTimeout(() => {
        clearInterval(interval);
        tickIntervalsRef.current.delete(id);

        const finalPerk = finalPerks.get(id) ?? null;
        setReels((prev) => prev.map((r) => (r.id === id ? { ...r, perk: finalPerk } : r)));
        setSpinningIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        playReelThud();

        doneCount++;
        if (doneCount === ids.length) onAllDone();
      }, 900 + i * 220);
      stopTimeoutsRef.current.push(stopTimeout);
    });
  };

  const handlePullLever = () => {
    if (phase !== 'idle' || activePlayablePerks.length === 0) return;

    const reelCount = Math.min(activePlayablePerks.length, Math.floor(Math.random() * 3) + 6); // 6-8
    const initialReels: Reel[] = Array.from({ length: reelCount }, (_, id) => ({ id, perk: null, locked: false }));
    setReels(initialReels);
    setSelected([]);
    setStaged(new Set());
    setCycleIndex(0);
    setPhase('spinning');

    const picks = pickRandomLoadout(activePlayablePerks, activeMutator, reelCount);
    const finalMap = new Map<number, Perk | null>(initialReels.map((r, i) => [r.id, picks[i] ?? null]));
    spinReels(
      initialReels.map((r) => r.id),
      finalMap,
      () => setPhase('awaiting')
    );
  };

  const toggleStage = (id: number) => {
    if (phase !== 'awaiting') return;
    const range = getSelectionRange(selected.length, cycleIndex);
    setStaged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= range.max) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (phase !== 'awaiting') return;
    const range = getSelectionRange(selected.length, cycleIndex);
    if (staged.size < range.min || staged.size > range.max) return;

    const newlyLocked = reels.filter((r) => staged.has(r.id) && r.perk);
    const newlyLockedSlots = buildDrawnSlots(
      newlyLocked.map((r) => r.perk as Perk),
      activePlayablePerks
    );
    const nextSelected = [...selected, ...newlyLockedSlots];

    const lockedReels = reels.map((r) => (staged.has(r.id) ? { ...r, locked: true } : r));
    setReels(lockedReels);
    setStaged(new Set());
    setSelected(nextSelected);

    if (nextSelected.length >= SLOT_LOADOUT_SIZE) {
      setPhase('complete');
      celebrate(role, resultsRef.current);
      onRollComplete(nextSelected);
      return;
    }

    const nextCycleIndex = cycleIndex + 1;
    setCycleIndex(nextCycleIndex);

    const unlockedIds = lockedReels.filter((r) => !r.locked).map((r) => r.id);
    const lockedNames = new Set(
      lockedReels.filter((r) => r.locked).map((r) => r.perk?.name).filter((n): n is string => Boolean(n))
    );
    const pool = activePlayablePerks.filter((p) => !lockedNames.has(p.name));
    const picks = pickRandomLoadout(pool, activeMutator, unlockedIds.length);
    const finalMap = new Map<number, Perk | null>(unlockedIds.map((id, i) => [id, picks[i] ?? null]));

    setPhase('spinning');
    spinReels(unlockedIds, finalMap, () => setPhase('awaiting'));
  };

  const handleReset = () => {
    setPhase('idle');
    setReels([]);
    setStaged(new Set());
    setCycleIndex(0);
    setSelected([]);
  };

  const range = phase === 'awaiting' ? getSelectionRange(selected.length, cycleIndex) : { min: 0, max: 0 };
  const canConfirm = staged.size >= range.min && staged.size <= range.max;
  const confirmHint =
    range.min === range.max
      ? (dict?.generator?.slotSelectExact || 'Select exactly {count} to continue').replace('{count}', String(range.min))
      : range.min === 0
        ? (dict?.generator?.slotSelectUpTo || 'Select up to {max} (optional)').replace('{max}', String(range.max))
        : (dict?.generator?.slotSelectRange || 'Select {min}-{max} to continue')
            .replace('{min}', String(range.min))
            .replace('{max}', String(range.max));

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-10">
      {phase === 'idle' && (
        <>
          <p className="text-xs font-bold text-slate-400 text-center">
            {dict?.generator?.slotMachinePrompt ||
              'Pull the lever, then lock in perks over up to 3 cycles until your loadout is full.'}
          </p>
          <button
            type="button"
            onClick={handlePullLever}
            disabled={activePlayablePerks.length === 0}
            className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
              role === 'Survivor'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
                : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            }`}
          >
            <Rows3 className="h-6 w-6" />
            <span>{dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}</span>
          </button>
        </>
      )}

      {(phase === 'spinning' || phase === 'awaiting') && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-black uppercase tracking-wide text-amber-400">
            <span>{(dict?.generator?.slotCycleLabel || 'Cycle {cycle}/3').replace('{cycle}', String(cycleIndex + 1))}</span>
            <span className="text-slate-600">{'•'}</span>
            <span>{(dict?.generator?.slotLockedCount || '{count}/4 Locked').replace('{count}', String(selected.length))}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {reels.map((reel) => {
              const isStaged = staged.has(reel.id);
              return (
                <motion.div
                  key={reel.id}
                  className="relative"
                  animate={!reduceMotion && spinningIds.has(reel.id) ? { y: [0, -6, 0] } : { y: 0 }}
                  transition={!reduceMotion && spinningIds.has(reel.id) ? { repeat: Infinity, duration: 0.15 } : {}}
                >
                  <div
                    className={cn(
                      'relative rounded-2xl',
                      reel.locked && 'ring-2 ring-amber-500',
                      isStaged && !reel.locked && 'ring-2 ring-emerald-400'
                    )}
                  >
                    <PerkSlot
                      perk={reel.perk}
                      role={role}
                      onClick={
                        phase === 'awaiting' && !reel.locked && !spinningIds.has(reel.id)
                          ? () => toggleStage(reel.id)
                          : undefined
                      }
                      dict={dict}
                    />
                  </div>
                  {reel.locked && (
                    <div className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {phase === 'awaiting' && (
            <>
              <p aria-live="polite" className="text-xs font-bold text-slate-400 text-center">
                {confirmHint}
              </p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`flex items-center gap-3 rounded-2xl px-8 py-4 font-black text-sm tracking-wider uppercase shadow-2xl transition-all duration-300 ${
                  canConfirm
                    ? `cursor-pointer active:scale-95 ${
                        role === 'Survivor'
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white'
                          : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white'
                      }`
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Lock className="h-5 w-5" />
                <span>{dict?.generator?.slotConfirmSelection || 'Confirm Selection'}</span>
              </button>
            </>
          )}
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
            <span>{dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}</span>
          </button>
        </>
      )}

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
