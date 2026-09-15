// frontend/src/components/generator/modes/LootCrateStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift, Lock } from 'lucide-react';
import { DbdButton } from '../shared/DbdButton';
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
  /** Landing position as a percentage of the scatter field, so the perks
   * genuinely land thrown around the block instead of snapping into a grid. */
  xPct: number;
  yPct: number;
  scale: number;
  /** Where it flies in FROM (a delta from its landing spot), so it reads as
   * "thrown out of the crate" rather than fading in in place. */
  fromX: number;
  fromY: number;
}

/** A 4x3 cell grid (12 slots -- covers the 8-12 throw range) shuffled and
 * jittered per-item, so drops land scattered around the block view without
 * two perks ever landing on top of each other. */
function buildScatterLayout(count: number): { xPct: number; yPct: number }[] {
  const cols = 4;
  const rows = 3;
  const cells: { xPct: number; yPct: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      cells.push({
        xPct: (cIdx + 0.5) * (100 / cols),
        yPct: (r + 0.5) * (100 / rows),
      });
    }
  }
  // Shuffle (Fisher-Yates).
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, count).map((cell) => ({
    xPct: Math.min(94, Math.max(6, cell.xPct + (Math.random() - 0.5) * 14)),
    yPct: Math.min(90, Math.max(10, cell.yPct + (Math.random() - 0.5) * 20)),
  }));
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

function scatterPointStyle(point: { xPct: number; yPct: number }): { left: string; top: string } {
  return {
    left: `clamp(${SCATTER_EDGE_MARGIN_PX}px, ${point.xPct}%, calc(100% - ${SCATTER_EDGE_MARGIN_PX}px))`,
    top: `clamp(${SCATTER_EDGE_MARGIN_PX}px, ${point.yPct}%, calc(100% - ${SCATTER_EDGE_MARGIN_PX}px))`,
  };
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
  const [lockedItems, setLockedItems] = useState<ScatterItem[]>([]);
  const [selected, setSelected] = useState<DrawnSlot[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<(NodeJS.Timeout | number)[]>([]);
  const { celebrate } = useJackpotCelebration();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach((id) => clearTimeout(id));
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
      const layout = buildScatterLayout(drawn.length);
      const pool: ScatterItem[] = drawn.map((slot, i) => ({
        ...slot,
        id: slot.perk?.name || `${slot.page}-${slot.slot}`,
        rotate: (Math.random() - 0.5) * 30,
        xPct: layout[i].xPct,
        yPct: layout[i].yPct,
        scale: 0.88 + Math.random() * 0.24,
        fromX: (Math.random() - 0.5) * 260,
        fromY: -220 - Math.random() * 80,
      }));

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

    // The picked perk stays exactly where it landed and switches to a
    // locked visual -- it moves into its own array so it's never touched
    // by the scatterPool's AnimatePresence exit animation (that's reserved
    // for perks the Entity claims away below).
    setLockedItems((prev) => [...prev, item]);

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

  /** "Crack Open Another" on the completed-loadout screen -- goes straight
   * into a brand-new open (shake -> scatter) instead of dropping back to the
   * closed 'Tap the Trial Offering' screen and forcing a second click. */
  const handleReset = () => {
    setScatterPool([]);
    setLockedItems([]);
    setSelected([]);
    beginOpen();
  };

  const scatterPrompt = (
    dict?.generator?.scatterPrompt ||
    'Pick one. Choosing it costs the Entity 1-2 of the others. {count}/4 locked in.'
  ).replace('{count}', String(selected.length));

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8">
      {(phase === 'closed' || phase === 'shaking') && (
        <>
          <p className="max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary">
            {dict?.generator?.cratePrompt ||
              'A sealed Trial Offering awaits. Crack it open and the Entity scatters perks around the block for you to pick from.'}
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
              className={`h-28 w-28 sm:h-36 sm:w-36 xl:h-48 xl:w-48 2xl:h-60 2xl:w-60 wide:h-72 wide:w-72 ${role === 'Survivor' ? 'text-accent-green' : 'text-accent-red'}`}
            />
          </motion.button>
          {phase === 'closed' && (
            <>
              <p className="text-xs sm:text-sm xl:text-base 2xl:text-lg wide:text-xl font-black uppercase tracking-wide text-text-muted">
                {dict?.generator?.crateTapToOpen || 'Tap the Trial Offering'}
              </p>
              <DbdButton
                role={role}
                size="lg"
                onClick={handleOpen}
                disabled={activePlayablePerks.length === 0}
              >
                {dict?.generator?.crateTapToOpen || 'Crack Open Offering'}
              </DbdButton>
            </>
          )}
          {phase === 'shaking' && (
            <p aria-live="polite" className="text-xs sm:text-sm xl:text-base 2xl:text-lg wide:text-xl font-black uppercase tracking-wide text-accent-amber animate-pulse">
              {dict?.generator?.crateOpening || 'Cracking Open...'}
            </p>
          )}
        </>
      )}

      {phase === 'scattering' && (
        <>
          <p aria-live="polite" className="max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary">
            {scatterPrompt}
          </p>

          {/* Mobile & Tablet (< md): Centered balanced offerings and 4-slot loadout tray */}
          <div className="flex flex-col items-center justify-center flex-1 w-full my-auto gap-3.5 md:hidden">
            {/* 4-Slot Loadout Progress Tray */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-1.5 px-3 rounded-2xl bg-bg-surface/90 border border-border-color shadow-xs backdrop-blur-sm">
              {[0, 1, 2, 3].map((slotIdx) => {
                const locked = lockedItems[slotIdx];
                return locked ? (
                  <div key={`mob-tray-locked-${locked.id}`} className="relative">
                    <div className="rounded-xl ring-2 ring-accent-amber/60">
                      <PerkSlot perk={locked.perk} role={role} page={locked.page} slot={locked.slot} size="compact" dict={dict} />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-text-inverted shadow-xs">
                      <Lock className="h-3 w-3" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={`mob-tray-empty-${slotIdx}`}
                    className="flex flex-col items-center justify-center w-[74px] h-[74px] xs:w-[84px] xs:h-[84px] rounded-2xl border-2 border-dashed border-border-color bg-bg-surface/90 text-text-muted"
                  >
                    <span className="text-xs font-mono font-bold opacity-40">#{slotIdx + 1}</span>
                  </div>
                );
              })}
            </div>

            {/* Scattered Offerings: Symmetrically Centered Flex Wrap */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 xs:gap-3 sm:gap-4 w-full max-w-sm sm:max-w-md mx-auto py-1">
              <AnimatePresence>
                {scatterPool.map((item) => (
                  <motion.div
                    key={`mob-scatter-${item.id}`}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.94 }}
                    className="cursor-pointer shrink-0"
                  >
                    <PerkSlot
                      perk={item.perk}
                      role={role}
                      page={item.page}
                      slot={item.slot}
                      size="compact"
                      onClick={() => handlePick(item)}
                      dict={dict}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop (>= md): Cinematic absolute scatter field */}
          <div className="relative h-full min-h-[320px] w-full flex-1 hidden md:block">
            {lockedItems.map((item) => (
              <motion.div
                key={`locked-${item.id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={scatterPointStyle(item)}
                initial={reduceMotion ? false : { scale: item.scale * 1.3, opacity: 0.4 }}
                animate={{ scale: item.scale, opacity: 1, rotate: 0 }}
                transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="relative">
                  <div className="rounded-xl ring-2 ring-accent-amber/60">
                    <PerkSlot perk={item.perk} role={role} page={item.page} slot={item.slot} dict={dict} />
                  </div>
                  <div className="absolute -top-2 -right-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber text-text-inverted shadow-xs">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {scatterPool.map((item) => (
                <motion.div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={scatterPointStyle(item)}
                  initial={reduceMotion ? false : { opacity: 0, x: item.fromX, y: item.fromY, rotate: item.rotate * 2.2, scale: 0.4 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: item.rotate, scale: item.scale }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: item.rotate + 50, transition: { duration: 0.25 } }}
                  transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 210, damping: 16 }}
                  whileHover={reduceMotion ? undefined : { scale: item.scale * 1.08, rotate: 0, zIndex: 20 }}
                >
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
          <p className="text-sm font-bold text-text-secondary text-center sm:text-base">
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
          >
            {dict?.generator?.crateOpenAnother || 'Crack Open Another'}
          </DbdButton>
        </>
      )}
    </div>
  );
};


