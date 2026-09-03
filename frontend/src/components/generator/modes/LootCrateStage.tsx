// frontend/src/components/generator/modes/LootCrateStage.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift, Sparkles, Lock } from 'lucide-react';
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
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 py-4">
      {(phase === 'closed' || phase === 'shaking') && (
        <>
          <p className="max-w-lg text-center text-sm font-bold text-slate-600 dark:text-slate-300 sm:text-base">
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
          <p aria-live="polite" className="max-w-lg text-center text-sm font-bold text-slate-600 dark:text-slate-300 sm:text-base">
            {scatterPrompt}
          </p>

          {/* Explicit min-height floor (not just flex-1/min-h-0) -- relying
              purely on the flex chain to hand this box a real height left it
              able to collapse to near-zero in some viewport/flex-basis
              combinations, which read as "nothing happened" after opening
              the crate since the scattered perks had no box to lay out in. */}
          <div className="relative h-full min-h-[260px] w-full flex-1 sm:min-h-[320px]">
            {lockedItems.map((item) => (
              <motion.div
                key={`locked-${item.id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${item.xPct}%`, top: `${item.yPct}%` }}
                initial={reduceMotion ? false : { scale: item.scale * 1.3, opacity: 0.4 }}
                animate={{ scale: item.scale, opacity: 1, rotate: 0 }}
                transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="relative">
                  <div className="rounded-xl ring-2 ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)]">
                    <PerkSlot perk={item.perk} role={role} page={item.page} slot={item.slot} dict={dict} />
                  </div>
                  <div className="absolute -top-2 -right-2 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg">
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
                  style={{ left: `${item.xPct}%`, top: `${item.yPct}%` }}
                  initial={reduceMotion ? false : { opacity: 0, x: item.fromX, y: item.fromY, rotate: item.rotate * 2.2, scale: 0.4 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: item.rotate, scale: item.scale }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: item.rotate + 50, transition: { duration: 0.25 } }}
                  transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 210, damping: 16 }}
                  whileHover={reduceMotion ? undefined : { scale: item.scale * 1.08, rotate: 0, zIndex: 20 }}
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
            {dict?.generator?.crateOpenAnother || 'Crack Open Another'}
          </DbdButton>
        </>
      )}

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


