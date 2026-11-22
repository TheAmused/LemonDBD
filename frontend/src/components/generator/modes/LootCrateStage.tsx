'use client';
// frontend/src/components/generator/modes/LootCrateStage.tsx

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { DbdButton } from '@/components/common/Button';
import type { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';

import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { chaosPoints, phoneScatterField, type PhoneScatterField } from '../lib/scatterPoints';
import { PerkSlot } from '../shared/PerkSlot';
import { StagePrompt, StageProp } from '../shared/StageIdle';
import { playFanfare, playReelThud, playCardFlip } from '@/utils/perkAudio';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { publicImageThumb } from '@/utils/publicThumb';

export interface LootCrateStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  /** Fires once the loadout is full (analytics). */
  onLoadoutComplete?: () => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
  backendBase?: string;
  /** The loadout picked last time, shown from the start. */
  initialSlots?: DrawnSlot[];
}

type CratePhase = 'closed' | 'shaking' | 'scattering' | 'complete';

const LOADOUT_SIZE = 4;

interface ScatterItem extends DrawnSlot {
  id: string;
  rotate: number;
  /** Desktop: the grid cell it lands in (percent of the scatter field) and its own random offset from the
   * cell centre, in -1..1 (see `scatterPoint`). */
  cellXPct: number;
  cellYPct: number;
  jitterX: number;
  jitterY: number;
  /** Phone: where it lands (percent of the field), anywhere, see `chaosPoints`. */
  phoneXPct: number;
  phoneYPct: number;
  scale: number;
  /** Where it flies in FROM (a delta from its landing spot), so it reads as
   * "thrown out of the crate" rather than fading in in place. */
  fromX: number;
  fromY: number;
}

/** Centres of a cols x rows grid (percent of the field), in random order. */
function shuffledCells(cols: number, rows: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      cells.push({ x: (cIdx + 0.5) * (100 / cols), y: (r + 0.5) * (100 / rows) });
    }
  }
  // Shuffle (Fisher-Yates).
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

/** A 4x3 cell grid on desktop (12 slots -- covers the 8-12 throw range), shuffled, each item with its
 * own random offset, so drops land scattered around the block view without two perks ever landing on
 * top of each other. A phone gets free random points
 * instead, checked so that no two perks overlap (see `chaosPoints`). */
function buildScatterLayout(count: number, phoneField: PhoneScatterField): Pick<ScatterItem, 'cellXPct' | 'cellYPct' | 'jitterX' | 'jitterY' | 'phoneXPct' | 'phoneYPct'>[] {
  const desktop = shuffledCells(4, 3);
  const phone = chaosPoints(count, phoneField);
  return Array.from({ length: count }, (_, i) => ({
    cellXPct: desktop[i].x,
    cellYPct: desktop[i].y,
    jitterX: Math.random() * 2 - 1,
    jitterY: Math.random() * 2 - 1,
    phoneXPct: phone[i].x,
    phoneYPct: phone[i].y,
  }));
}

/** How far (percent of the field) a desktop item may sit from its cell centre. */
const DESKTOP_SPREAD_X_PCT = 7;
const DESKTOP_SPREAD_Y_PCT = 10;

function scatterPoint(item: ScatterItem): { xPct: number; yPct: number } {
  return {
    xPct: Math.min(94, Math.max(6, item.cellXPct + item.jitterX * DESKTOP_SPREAD_X_PCT)),
    yPct: Math.min(90, Math.max(10, item.cellYPct + item.jitterY * DESKTOP_SPREAD_Y_PCT)),
  };
}

/**
 * A percentage position alone isn't safe here: each card is centered ON that
 * point (`-translate-x-1/2 -translate-y-1/2`), so what actually needs to stay
 * on-screen is the point plus half the card's rendered width/height in
 * pixels -- and the card's size comes from `PerkSlot`'s own Tailwind
 * breakpoints (up to 240px at 2xl+), which don't scale with how wide this
 * particular scatter field happens to be. A 6%-from-the-edge point is only
 * safe in a container wide enough that 6% is more than half the card's
 * pixel width; in anything narrower -- which is normal, since this field
 * sits inside the page's own layout, not the full viewport -- the card
 * spills off-screen. `clamp()` with a pixel floor/ceiling guarantees at
 * least that much room from every edge regardless of container width, while
 * still following the intended percentage wherever there's space for it.
 */
const SCATTER_EDGE_MARGIN_PX = 130;

function scatterPointStyle(point: { xPct: number; yPct: number }, edgeMarginPx: number): { left: string; top: string } {
  return {
    left: `clamp(${edgeMarginPx}px, ${point.xPct}%, calc(100% - ${edgeMarginPx}px))`,
    top: `clamp(${edgeMarginPx}px, ${point.yPct}%, calc(100% - ${edgeMarginPx}px))`,
  };
}

/** After a pick the Entity claims 1-2 of the remaining perks at random -- but never more than
 * would leave fewer than `stillNeeded` to finish the loadout. */
function entityClaims<T>(pool: T[], stillNeeded: number): { remaining: T[]; claimed: number } {
  if (stillNeeded <= 0 || pool.length === 0) return { remaining: pool, claimed: 0 };
  const maxSafeDeletes = Math.max(0, pool.length - stillNeeded);
  const claimed = Math.min(1 + (Math.random() < 0.5 ? 1 : 0), maxSafeDeletes);
  let remaining = pool;
  for (let i = 0; i < claimed; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    remaining = remaining.filter((_, pi) => pi !== idx);
  }
  return { remaining, claimed };
}

export const LootCrateStage: React.FC<LootCrateStageProps> = ({
      role,
      activePlayablePerks,
      activeMutator,
      onRollComplete,
      onLoadoutComplete,
      revealedSlots,
      onRevealSlot,
      onSelectPerk,
      isBlind = false,
      initialSlots,
    }) => {
  const dict = useDictionary();
  const [phase, setPhase] = useState<CratePhase>(initialSlots?.length ? 'complete' : 'closed');
  const [scatterPool, setScatterPool] = useState<ScatterItem[]>([]);
  // The phone's scatter field is sized from the screen when the pool is thrown, and the perks are placed to fit it.
  const [phoneField, setPhoneField] = useState<PhoneScatterField>(() => phoneScatterField(390, 844));
  const [lockedItems, setLockedItems] = useState<ScatterItem[]>([]);
  const lockedIds = new Set(lockedItems.map((l) => l.id));
  const [selected, setSelected] = useState<DrawnSlot[]>(initialSlots ?? []);
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    isMountedRef.current = true;
    // The list is only ever pushed to, so the one read here is the one to clear on unmount.
    const timeouts = timeoutsRef.current;
    return () => {
      isMountedRef.current = false;
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, []);

  /** The actual open flow -- shake, then throw a fresh scatter pool -- with
   * no dependency on the current phase. Both the first "Tap the Trial
   * Offering" press (via handleOpen, still phase-gated to 'closed') and the
   * "Crack Open Another" button on the completed-loadout screen (via
   * handleReset, which used to just drop back to 'closed' and make the
   * player press Open a second time) funnel through this. */
  const beginOpen = () => {
    if (activePlayablePerks.length === 0) return;

    setPhase('shaking');

    const shakeTimeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) return;

      const throwCount = Math.min(activePlayablePerks.length, Math.floor(Math.random() * 5) + 8); // 8-12
      const picked = pickRandomLoadout(activePlayablePerks, activeMutator, throwCount);
      const drawn = buildDrawnSlots(picked, activePlayablePerks);
      const field = phoneScatterField(window.innerWidth, window.innerHeight);
      const layout = buildScatterLayout(drawn.length, field);
      const pool: ScatterItem[] = drawn.map((slot, i) => ({
        ...slot,
        id: slot.perk?.name || `${slot.page}-${slot.slot}`,
        rotate: (Math.random() - 0.5) * 30,
        ...layout[i],
        scale: 0.88 + Math.random() * 0.24,
        fromX: (Math.random() - 0.5) * 260,
        fromY: -220 - Math.random() * 80,
      }));

      setPhoneField(field);
      setScatterPool(pool);
      setLockedItems([]);
      setSelected([]);
      setPhase('scattering');
    }, 700);
    timeoutsRef.current.push(shakeTimeoutId);
  };

  const handleOpen = () => {
    if (phase !== 'closed' || activePlayablePerks.length === 0) return;
    beginOpen();
  };

  const handlePick = (item: ScatterItem) => {
    if (phase !== 'scattering') return;

    playCardFlip();

    const nextSelected = [...selected, { page: item.page, slot: item.slot, perk: item.perk }];

    // The picked perk stays exactly where it landed: it keeps its place in the scatter pool and
    // simply loses its grey (see `lockedIds`). Only perks the Entity claims leave the field.
    setLockedItems((prev) => [...prev, item]);

    // Let the Entity claim 1-2 of the offerings still on the field at random -- but never past
    // what's still needed to finish the loadout, and never past what's actually available.
    const { remaining, claimed } = entityClaims(
      scatterPool.filter((p) => p.id !== item.id && !lockedIds.has(p.id)),
      LOADOUT_SIZE - nextSelected.length
    );
    if (claimed > 0) {
      const thudTimeoutId = window.setTimeout(() => playReelThud(), 150);
      timeoutsRef.current.push(thudTimeoutId);
    }
    const keptIds = new Set(remaining.map((p) => p.id));
    const remainingPool = scatterPool.filter((p) => p.id === item.id || lockedIds.has(p.id) || keptIds.has(p.id));

    setSelected(nextSelected);
    setScatterPool(remainingPool);

    // Complete once the loadout is full, or if the Entity ran out of perks
    // to offer before that (only possible with a very small playable pool).
    if (nextSelected.length >= LOADOUT_SIZE || remaining.length === 0) {
      setPhase('complete');
      playFanfare();
      onRollComplete(nextSelected);
      onLoadoutComplete?.();
    }
  };

  /** "Crack Open Another" on the completed-loadout screen -- goes straight
   * into a brand-new open (shake -> scatter) instead of dropping back to the
   * closed 'Tap the Trial Offering' screen and forcing a second click. */
  const handleReset = () => {
    setScatterPool([]);
    setLockedItems([]);
    setSelected([]);
    beginOpen();
  };

  const scatterPrompt = formatMessage((
      dict.generator.scatterPrompt
    ), { count: selected.length });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8">
      {(phase === 'closed' || phase === 'shaking') && (
        <>
          <StagePrompt>
            {dict.generator.cratePrompt}
          </StagePrompt>
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
            whileHover={!reduceMotion && phase === 'closed' ? { scale: 1.05 } : undefined}
            whileTap={!reduceMotion && phase === 'closed' ? { scale: 0.95 } : undefined}
            className="group cursor-pointer disabled:cursor-default"
          >
            <StageProp src={publicImageThumb('/images/randomizer/crate.webp')} />
          </motion.button>
          {phase === 'closed' && (
            <DbdButton
              role={role}
              size="lg"
              onClick={handleOpen}
              disabled={activePlayablePerks.length === 0}
            >
              {dict.generator.crateTapToOpen}
            </DbdButton>
          )}
          {phase === 'shaking' && (
            <p aria-live="polite" className="text-xs sm:text-sm xl:text-base 2xl:text-lg wide:text-xl font-black uppercase tracking-wide text-accent-amber animate-pulse">
              {dict.generator.crateOpening}
            </p>
          )}
        </>
      )}

      {phase === 'scattering' && (
        <>
          {/* How it works is already explained next to the crate before it is opened, so the pick count is only
              announced to screen readers. */}
          <p aria-live="polite" className="sr-only">
            {scatterPrompt}
          </p>

          {/* Phones (< md): the same chaos as on desktop, on a fixed field: large perks thrown about at random.
              They carry no [P/S] tag while you pick; it shows once the loadout is done. */}
          <div className="flex w-full flex-1 items-center justify-center md:hidden">
            <div className="relative w-full max-w-md sm:max-w-xl" style={{ height: phoneField.height }}>
              <AnimatePresence>
                {scatterPool.map((item) => {
                  const locked = lockedIds.has(item.id);
                  return (
                    <motion.div
                      key={`mob-${item.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={scatterPointStyle({ xPct: item.phoneXPct, yPct: item.phoneYPct }, phoneField.marginPx)}
                      initial={reduceMotion ? false : { opacity: 0, x: item.fromX * 0.5, y: item.fromY * 0.5, rotate: item.rotate, scale: 0.4 }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: item.rotate, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, transition: { duration: 0.25 } }}
                      transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 210, damping: 16 }}
                      whileTap={reduceMotion || locked ? undefined : { scale: 0.94 }}
                    >
                      <PerkSlot
                        perk={item.perk}
                        role={role}
                        size="compact"
                        muted={!locked}
                        onClick={locked ? undefined : () => handlePick(item)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop (>= md): Cinematic absolute scatter field */}
          <div className="relative h-full min-h-80 w-full flex-1 hidden md:block">
            <AnimatePresence>
              {scatterPool.map((item) => (
                <motion.div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group"
                  style={scatterPointStyle(scatterPoint(item), SCATTER_EDGE_MARGIN_PX)}
                  initial={reduceMotion ? false : { opacity: 0, x: item.fromX, y: item.fromY, rotate: item.rotate * 2.2, scale: 0.4 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: item.rotate, scale: item.scale }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: item.rotate + 50, transition: { duration: 0.25 } }}
                  transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 210, damping: 16 }}
                  whileHover={reduceMotion ? undefined : { scale: item.scale * 1.1, rotate: 0, zIndex: 20 }}
                >
                  <div className="relative">
                    <PerkSlot
                      perk={item.perk}
                      role={role}
                      page={item.page}
                      slot={item.slot}
                      muted={!lockedIds.has(item.id)}
                      onClick={lockedIds.has(item.id) ? undefined : () => handlePick(item)}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {phase === 'complete' && (
        <>
          <p className="text-sm font-bold text-text-secondary text-center sm:text-base">
            {dict.generator.scatterComplete}
          </p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                />
              );
            })}
          </div>
          <DbdButton
            role={role}
            size="md"
            onClick={handleReset}
          >
            {dict.generator.crateOpenAnother}
          </DbdButton>
        </>
      )}
    </div>
  );
};


