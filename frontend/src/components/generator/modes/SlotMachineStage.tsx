// frontend/src/components/generator/modes/SlotMachineStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Rows3, Lock, Sparkles, Ban } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { getSelectionRange, SLOT_LOADOUT_SIZE } from '../lib/slotMachineRules';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playReelTick, playReelThud, playCurseSound } from '@/utils/perkAudio';
import { getPerkIconUrl } from '@/utils/perkUtils';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/common/Tooltip';
import { DbdButton } from '../shared/DbdButton';

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

interface StripCell {
  perk: Perk | null;
  broken?: boolean;
  /** [Page/Slot] coordinate for this cell's perk within the active pool --
   * computed once at strip-build time (same formula as buildDrawnSlots) so
   * every cell can show it, not just the one that ends up locked in. */
  page?: number;
  slot?: number;
}

interface Reel {
  id: number;
  /** A jammed reel for this whole draw -- always lands on the broken glyph,
   * can never be staged/locked, and stays broken through every respin cycle
   * until a brand-new "Pull the Lever" draw picks fresh broken reels. */
  broken: boolean;
  locked: boolean;
  strip: StripCell[];
  /** The perk this reel is *actually* landing on -- decided the moment the
   * spin starts (matches the classic slot-machine trick of the outcome
   * being fixed before the reel visually stops). null for broken reels. */
  landedPerk: Perk | null;
  /** Current vertical offset of the scrolling strip, in px (0 = reset, TARGET_Y = landed). */
  translateY: number;
  /** Bumped every spin so the scrolling strip remounts fresh at
   * translateY(0) with no transition, instead of visibly rewinding from
   * wherever the last spin left it. */
  spinToken: number;
  spinDurationMs: number;
}

const TICK_INTERVAL_MS = 90;
const REEL_COUNT = 8;
const STRIP_FILLER = 20;
const FINAL_INDEX = STRIP_FILLER;
// Reel cell size is measured off the actual rendered reel area (see
// `reelAreaRef` below) instead of a fixed pixel constant, so the machine
// genuinely fills whatever space the screen gives it -- a tall desktop
// monitor and a short mobile viewport both get reels sized to fit, with no
// leftover dead space and no breakpoint snapping in between.
const REEL_MIN_PX = 64;
const REEL_MAX_PX = 190;
const REEL_GAP_PX = 12;

const PERKS_PER_PAGE = 15;

function randomPerk(pool: Perk[]): Perk | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Same [Page/Slot] formula as buildDrawnSlots -- a perk's coordinate is
 * just its index within the active pool, so any perk (not only a locked
 * one) can be tagged with it. */
function coordFor(perk: Perk | null, pool: Perk[]): { page?: number; slot?: number } {
  if (!perk) return {};
  const indexInPool = pool.findIndex((p) => p.name === perk.name);
  if (indexInPool === -1) return {};
  return {
    page: Math.floor(indexInPool / PERKS_PER_PAGE) + 1,
    slot: (indexInPool % PERKS_PER_PAGE) + 1,
  };
}

function cellFor(perk: Perk | null, pool: Perk[]): StripCell {
  return { perk, ...coordFor(perk, pool) };
}

function buildStrip(pool: Perk[], landedPerk: Perk | null, broken: boolean): StripCell[] {
  const filler: StripCell[] = Array.from({ length: STRIP_FILLER }, () => cellFor(randomPerk(pool), pool));
  const finalCell: StripCell = broken ? { perk: null, broken: true } : cellFor(landedPerk, pool);
  const after: StripCell[] = Array.from({ length: 2 }, () => cellFor(randomPerk(pool), pool));
  return [...filler, finalCell, ...after];
}

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
  const [cellPx, setCellPx] = useState(104);

  const reelsRef = useRef<Reel[]>([]);
  const reelAreaRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<MachinePhase>('idle');
  const tickIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const pendingDoneRef = useRef<{ remaining: Set<number>; onAllDone: () => void } | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    reelsRef.current = reels;
  }, [reels]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Measures the actual reel area (real ResizeObserver, not a Tailwind
  // breakpoint guess) and derives a cell size that fills it in both axes --
  // capped by height/3 (so three stacked cells fit the window) and by
  // width/REEL_COUNT (so eight reels fit across without overflowing), then
  // clamped to a sane min/max so it never gets comically tiny or huge.
  //
  // The measurement box below is mounted for the component's entire
  // lifetime (not just while reels are visible) so cellPx is already
  // correct *before* the first "Pull the Lever" click -- otherwise the
  // very first spin's target offset gets computed off the stale default
  // (104px) while the reels themselves render at the freshly-measured
  // size, and the strip lands mis-scrolled relative to the payline. Size
  // changes are ignored while a spin is actively in flight (`spinning`)
  // so an in-progress animation's target never gets invalidated mid-flight
  // by a resize; a resize during that window is picked up as soon as the
  // spin settles into `awaiting`.
  useEffect(() => {
    const el = reelAreaRef.current;
    if (!el) return;

    const compute = () => {
      if (phaseRef.current === 'spinning') return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const byHeight = Math.floor(rect.height / 3);
      const byWidth = Math.floor((rect.width - (REEL_COUNT - 1) * REEL_GAP_PX) / REEL_COUNT);
      const next = Math.max(REEL_MIN_PX, Math.min(REEL_MAX_PX, byHeight, byWidth));
      setCellPx((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  // Re-measure the instant a spin finishes, in case a resize landed while
  // it was in flight and got deliberately ignored above.
  useEffect(() => {
    if (phase === 'spinning') return;
    const el = reelAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const byHeight = Math.floor(rect.height / 3);
    const byWidth = Math.floor((rect.width - (REEL_COUNT - 1) * REEL_GAP_PX) / REEL_COUNT);
    const next = Math.max(REEL_MIN_PX, Math.min(REEL_MAX_PX, byHeight, byWidth));
    setCellPx((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, [phase]);

  useEffect(() => {
    return () => {
      tickIntervalsRef.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  /** Spins exactly the reels in `targetReels` (already carrying the right
   * `broken` flag) down to whatever perk `finalMap` decided for them, then
   * calls `onAllDone` once every one of them has visually landed. */
  const targetY = -(FINAL_INDEX - 1) * cellPx;

  const spinReels = (targetReels: Reel[], finalMap: Map<number, Perk | null>, onAllDone: () => void) => {
    const ids = targetReels.map((r) => r.id);
    setSpinningIds(new Set(ids));

    setReels((prev) =>
      prev.map((r) => {
        const idx = targetReels.findIndex((t) => t.id === r.id);
        if (idx === -1) return r;
        const match = targetReels[idx];
        const landedPerk = match.broken ? null : finalMap.get(r.id) ?? null;
        const strip = buildStrip(activePlayablePerks, landedPerk, match.broken);
        const spinDurationMs = reduceMotion ? 220 : 900 + idx * 180;
        return { ...match, strip, translateY: 0, spinToken: r.spinToken + 1, landedPerk, spinDurationMs };
      })
    );

    ids.forEach((id, i) => {
      const interval = setInterval(() => playReelTick(1 + i * 0.03), TICK_INTERVAL_MS);
      tickIntervalsRef.current.set(id, interval);
    });

    pendingDoneRef.current = { remaining: new Set(ids), onAllDone };

    // Double rAF: lets the browser paint the translateY(0)+fresh-strip reset
    // (committed via the bumped spinToken remount key) *before* we set the
    // target translateY, so the transition actually has something to
    // animate from instead of jumping straight there.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReels((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, translateY: targetY } : r)));
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
      ? (dict?.generator?.slotSelectExact || 'Select exactly {count} to continue').replace('{count}', String(range.min))
      : range.min === 0
        ? (dict?.generator?.slotSelectUpTo || 'Select up to {max} (optional)').replace('{max}', String(range.max))
        : (dict?.generator?.slotSelectRange || 'Select {min}-{max} to continue')
            .replace('{min}', String(range.min))
            .replace('{max}', String(range.max));

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 py-4">
      <div className="relative flex w-full flex-1 min-h-0 flex-col items-center justify-center gap-4">
        {/* Permanently-mounted, invisible measurement box -- always the
            same box the reel row occupies once phase is spinning/awaiting,
            so cellPx is measured continuously and is already correct
            before the very first spin (see the sizing effect above). */}
        <div ref={reelAreaRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-0" />

        {phase === 'idle' && (
        <>
          <p className="max-w-lg text-center text-sm font-bold text-slate-600 dark:text-slate-300 sm:text-base">
            {dict?.generator?.slotMachinePrompt ||
              'Pull the lever, then lock in perks over up to 3 cycles until your loadout is full.'}
            {' '}
            {dict?.generator?.slotCursedFlavor ||
              "Eight reels spin at once, but the machine's cursed, so a reel or two may jam broken."}
          </p>
          <DbdButton
            role={role}
            size="lg"
            onClick={handlePullLever}
            disabled={activePlayablePerks.length === 0}
            icon={<Rows3 className="h-6 w-6" />}
          >
            {dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}
          </DbdButton>
        </>
      )}

      {(phase === 'spinning' || phase === 'awaiting') && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-black uppercase tracking-wide text-amber-400 sm:text-base">
            <span>{(dict?.generator?.slotCycleLabel || 'Cycle {cycle}/3').replace('{cycle}', String(cycleIndex + 1))}</span>
            <span className="text-slate-600">{'•'}</span>
            <span>{(dict?.generator?.slotLockedCount || '{count}/4 Locked').replace('{count}', String(selected.length))}</span>
          </div>

          <div className="flex w-full flex-1 min-h-0 flex-nowrap items-center justify-center gap-3 overflow-x-auto px-1 pb-2">
            {reels.map((reel) => {
              const isStaged = staged.has(reel.id);
              const isSpinning = spinningIds.has(reel.id);
              const isClickable = phase === 'awaiting' && !reel.locked && !reel.broken && !isSpinning;
              const landedBroken = reel.broken && !isSpinning;

              const reelWindow = (
                <div
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={isClickable ? () => toggleStage(reel.id) : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') toggleStage(reel.id);
                        }
                      : undefined
                  }
                  className={cn(
                    'relative overflow-hidden rounded-lg border-2 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-inner transition-colors duration-200',
                    isClickable && 'cursor-pointer',
                    reel.locked
                      ? 'border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                      : isStaged
                        ? 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                        : landedBroken
                          ? 'border-red-700/70'
                          : 'border-slate-700/50'
                  )}
                  // Explicit pixel width instead of `w-full` -- the broken
                  // reel is the only one wrapped in <Tooltip>, whose
                  // trigger element is `inline-flex` (shrink-to-fit). That
                  // breaks a `w-full` child's percentage-width resolution,
                  // so it rendered narrower than every other (unwrapped)
                  // reel despite sharing the same cellPx-wide column. An
                  // absolute pixel width can't be affected by whatever
                  // wraps it.
                  style={{ height: cellPx * 3, width: cellPx }}
                >
                  <div
                    key={reel.spinToken}
                    onTransitionEnd={(e) => handleReelTransitionEnd(reel.id, e)}
                    className="flex flex-col ease-[cubic-bezier(0.13,0.82,0.22,1)]"
                    style={{
                      transform: `translateY(${reel.translateY}px)`,
                      transition: reel.strip.length ? `transform ${reel.spinDurationMs}ms cubic-bezier(0.13,0.82,0.22,1)` : 'none',
                    }}
                  >
                    {reel.strip.map((cell, i) => {
                      const coordLabel =
                        cell.perk && cell.page !== undefined && cell.slot !== undefined
                          ? `${dict?.generator?.coordOpenPage || '[P'}${cell.page}${dict?.generator?.coordSlot || '/S'}${cell.slot}${dict?.generator?.coordClose || ']'}`
                          : null;
                      return (
                        <div
                          key={i}
                          className="relative flex shrink-0 items-center justify-center"
                          style={{ height: cellPx }}
                        >
                          {cell.broken ? (
                            <Ban className="text-red-500" style={{ height: cellPx * 0.58, width: cellPx * 0.58 }} />
                          ) : cell.perk ? (
                            <img
                              src={getPerkIconUrl(cell.perk, backendBase) || ''}
                              alt=""
                              className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                              style={{ height: cellPx * 0.62, width: cellPx * 0.62 }}
                              loading="lazy"
                            />
                          ) : (
                            <div className="rounded-md bg-slate-800/60" style={{ height: cellPx * 0.62, width: cellPx * 0.62 }} />
                          )}
                          {coordLabel && (
                            <span
                              className="pointer-events-none absolute left-0.5 top-0.5 z-10 whitespace-nowrap font-mono font-black text-amber-400/90"
                              style={{ fontSize: Math.max(7, Math.min(11, cellPx * 0.09)) }}
                            >
                              {coordLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/70 via-transparent to-black/70" />

                  {reel.locked && (
                    <div className="absolute -top-2 -right-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );

              return (
                <div key={reel.id} className="flex shrink-0 flex-col items-center gap-1.5" style={{ width: cellPx }}>
                  {landedBroken ? (
                    <Tooltip
                      title={dict?.generator?.slotJammedTitle || 'Jammed'}
                      description={
                        dict?.generator?.slotJammedDesc ||
                        'This reel is broken for the whole draw, so it can never be picked. Pull a brand-new draw to clear it.'
                      }
                    >
                      {reelWindow}
                    </Tooltip>
                  ) : (
                    reelWindow
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wide',
                      reel.locked ? 'text-amber-400' : landedBroken ? 'text-red-500' : 'text-slate-600'
                    )}
                  >
                    {reel.locked ? (dict?.generator?.slotLockedLabel || 'Locked') : landedBroken ? (dict?.generator?.slotBrokenLabel || 'Broken') : `#${reel.id + 1}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Always mounted (just visibility-toggled) while spinning or
              awaiting, instead of only rendering during 'awaiting' -- this
              keeps the total content height in this column identical
              across both phases. Otherwise the reel row's flex-1 share of
              the fixed-height stage box changes the instant these two
              lines (dis)appear, which reflows cellPx right as a spin
              lands and desyncs the already-scrolled strip from its
              newly-resized cells -- reels visibly resize/misalign the
              moment the spin ends. */}
          <div className={cn('flex flex-col items-center gap-3', phase !== 'awaiting' && 'invisible')}>
            <p aria-live="polite" className="max-w-lg text-center text-sm font-bold text-slate-600 dark:text-slate-300 sm:text-base">
              {confirmHint}
            </p>
            <DbdButton
              role={role}
              size="md"
              onClick={handleConfirm}
              disabled={!canConfirm || phase !== 'awaiting'}
              icon={<Lock className="h-5 w-5" />}
            >
              {dict?.generator?.slotConfirmSelection || 'Confirm Selection'}
            </DbdButton>
          </div>
        </>
      )}

      {phase === 'complete' && (
        <>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 text-center sm:text-base">
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
          <DbdButton
            role={role}
            size="md"
            onClick={handleReset}
            icon={<Sparkles className="h-5 w-5" />}
          >
            {dict?.generator?.slotMachineSpinButton || 'Pull the Lever'}
          </DbdButton>
        </>
      )}
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


