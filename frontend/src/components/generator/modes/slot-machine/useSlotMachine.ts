// frontend/src/components/generator/modes/slot-machine/useSlotMachine.ts
import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { playReelTick, playReelThud, playCurseSound } from '@/utils/perkAudio';
import { pickRandomLoadout, buildDrawnSlots } from '../../lib/perkPicker';
import { getSelectionRange, SLOT_LOADOUT_SIZE } from '../../lib/slotMachineRules';
import { useJackpotCelebration } from '../../shared/useJackpotCelebration';
import { buildStrip, FINAL_INDEX, REEL_COUNT, STRIP_FILLER, TICK_INTERVAL_MS } from './slotMachineStrip';
import type { MachinePhase, Reel } from './slotMachineTypes';
import { useReelSizing } from './useReelSizing';

interface SlotMachineInput {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
}

/** The slot machine's whole state machine: pull, spin, stage reels, confirm, repeat until the loadout is full. */
export function useSlotMachine({ role, activePlayablePerks, activeMutator, onRollComplete }: SlotMachineInput) {
  const dict = useDictionary();
  const [phase, setPhase] = useState<MachinePhase>('idle');
  const [reels, setReels] = useState<Reel[]>([]);
  const [spinningIds, setSpinningIds] = useState<Set<number>>(new Set());
  const [staged, setStaged] = useState<Set<number>>(new Set());
  const [cycleIndex, setCycleIndex] = useState(0);
  const [selected, setSelected] = useState<DrawnSlot[]>([]);
  const { reelAreaRef, cellPx, isMobile } = useReelSizing(phase);

  const reelsRef = useRef<Reel[]>([]);
  const tickIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const pendingDoneRef = useRef<{ remaining: Set<number>; onAllDone: () => void } | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { celebrate } = useJackpotCelebration();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    reelsRef.current = reels;
  }, [reels]);

  useEffect(() => {
    return () => {
      tickIntervalsRef.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const spinReels = (targetReels: Reel[], finalMap: Map<number, Perk | null>, onAllDone: () => void) => {
    const ids = targetReels.map((r) => r.id);
    setSpinningIds(new Set(ids));

    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const desktopTarget = -(FINAL_INDEX - 1) * cellPx;
    const mobileStart = -(STRIP_FILLER * cellPx);

    setReels((prev) =>
      prev.map((r) => {
        const idx = targetReels.findIndex((t) => t.id === r.id);
        if (idx === -1) return r;
        const match = targetReels[idx];
        const landedPerk = match.broken ? null : finalMap.get(r.id) ?? null;
        const strip = buildStrip(activePlayablePerks, landedPerk, match.broken, mobile);
        const spinDurationMs = reduceMotion ? 220 : 900 + idx * 180;
        return {
          ...match,
          strip,
          translateY: 0,
          translateX: mobile ? mobileStart : 0,
          spinToken: r.spinToken + 1,
          landedPerk,
          spinDurationMs,
        };
      })
    );

    ids.forEach((id, i) => {
      const interval = setInterval(() => playReelTick(1 + i * 0.03), TICK_INTERVAL_MS);
      tickIntervalsRef.current.set(id, interval);
    });

    pendingDoneRef.current = { remaining: new Set(ids), onAllDone };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReels((prev) =>
          prev.map((r) =>
            ids.includes(r.id)
              ? {
                  ...r,
                  translateX: 0, // Animates rightwards to 0 on mobile!
                  translateY: mobile ? 0 : desktopTarget, // Animates upwards to desktopTarget on desktop!
                }
              : r
          )
        );
      });
    });
  };

  const handleReelTransitionEnd = (id: number, e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    const pending = pendingDoneRef.current;
    if (!pending || !pending.remaining.has(id)) return;

    const interval = tickIntervalsRef.current.get(id);
    if (interval) {
      clearInterval(interval);
      tickIntervalsRef.current.delete(id);
    }

    const reel = reelsRef.current.find((r) => r.id === id);
    if (reel?.broken) playCurseSound();
    else playReelThud();

    setSpinningIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    pending.remaining.delete(id);
    if (pending.remaining.size === 0) {
      pendingDoneRef.current = null;
      pending.onAllDone();
    }
  };

  /** The actual pull -- fresh reels, fresh spin -- with no dependency on
   * the current phase. Both the first "Pull the Lever" press (via
   * handlePullLever, still phase-gated to 'idle') and the completed-loadout
   * screen's "Pull the Lever" button (via handleReset, which used to just
   * drop back to 'idle' and make the player press the lever a second time)
   * funnel through this. */
  const beginPull = () => {
    if (activePlayablePerks.length === 0) return;

    const reelCount = Math.max(1, Math.min(REEL_COUNT, activePlayablePerks.length));
    // A jammed reel or two only makes sense once the machine is at full
    // size -- with a small perk pool every reel is precious.
    const brokenCount = reelCount === REEL_COUNT ? (Math.random() < 0.5 ? 1 : 2) : 0;
    const brokenIds = new Set<number>();
    while (brokenIds.size < brokenCount) {
      brokenIds.add(Math.floor(Math.random() * reelCount));
    }

    const initialReels: Reel[] = Array.from({ length: reelCount }, (_, id) => ({
      id,
      broken: brokenIds.has(id),
      locked: false,
      strip: [],
      landedPerk: null,
      translateY: 0,
      translateX: 0,
      spinToken: 0,
      spinDurationMs: 900,
    }));
    setReels(initialReels);
    setSelected([]);
    setStaged(new Set());
    setCycleIndex(0);
    setPhase('spinning');

    const nonBrokenIds = initialReels.filter((r) => !r.broken).map((r) => r.id);
    const picks = pickRandomLoadout(activePlayablePerks, activeMutator, nonBrokenIds.length);
    const finalMap = new Map<number, Perk | null>(nonBrokenIds.map((id, i) => [id, picks[i] ?? null]));

    spinReels(initialReels, finalMap, () => setPhase('awaiting'));
  };

  const handlePullLever = () => {
    if (phase !== 'idle' || activePlayablePerks.length === 0) return;
    beginPull();
  };

  const toggleStage = (id: number) => {
    if (phase !== 'awaiting') return;
    const reel = reels.find((r) => r.id === id);
    if (!reel || reel.broken) return;
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

    const newlyLocked = reels.filter((r) => staged.has(r.id) && r.landedPerk);
    const newlyLockedSlots = buildDrawnSlots(
      newlyLocked.map((r) => r.landedPerk as Perk),
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

    const unlockedReels = lockedReels.filter((r) => !r.locked);
    const nonBrokenUnlocked = unlockedReels.filter((r) => !r.broken);
    const lockedNames = new Set(
      lockedReels.filter((r) => r.locked).map((r) => r.landedPerk?.name).filter((n): n is string => Boolean(n))
    );
    const pool = activePlayablePerks.filter((p) => !lockedNames.has(p.name));
    const picks = pickRandomLoadout(pool, activeMutator, nonBrokenUnlocked.length);
    const finalMap = new Map<number, Perk | null>(nonBrokenUnlocked.map((r, i) => [r.id, picks[i] ?? null]));

    setPhase('spinning');
    spinReels(unlockedReels, finalMap, () => setPhase('awaiting'));
  };

  /** "Pull the Lever" on the completed-loadout screen -- goes straight into
   * a brand-new pull instead of dropping back to the idle screen and
   * forcing a second click. */
  const handleReset = () => {
    setStaged(new Set());
    setSelected([]);
    beginPull();
  };

  const range = phase === 'awaiting' ? getSelectionRange(selected.length, cycleIndex) : { min: 0, max: 0 };
  const canConfirm = staged.size >= range.min && staged.size <= range.max;
  const confirmHint =
    range.min === range.max
      ? formatMessage((dict.generator.slotSelectExact), { count: range.min })
      : range.min === 0
        ? formatMessage((dict.generator.slotSelectUpTo), { max: range.max })
        : formatMessage((dict.generator.slotSelectRange), { min: range.min, max: range.max });

  return {
    phase,
    reels,
    spinningIds,
    staged,
    cycleIndex,
    selected,
    cellPx,
    isMobile,
    reelAreaRef,
    resultsRef,
    canConfirm,
    confirmHint,
    handleReelTransitionEnd,
    handlePullLever,
    toggleStage,
    handleConfirm,
    handleReset,
  };
}
