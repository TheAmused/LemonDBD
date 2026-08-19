// frontend/src/components/streaks/chaos/useSlotReels.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Perk } from '@/types/gauntletStreak';

/** How long each reel spins before landing on its final perk. */
const REEL_SPIN_MS = [900, 1150, 1400, 1650];
/** How many placeholder frames flash by before landing, per reel. */
const FLASH_STEPS = 10;

export type ReelDirection = 'up' | 'down';

export function useSlotReels(finalPerks: Perk[]) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelDisplay, setReelDisplay] = useState<(Perk | null)[]>([null, null, null, null]);
  const [landedMask, setLandedMask] = useState<boolean[]>([false, false, false, false]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const start = useCallback(
    (onDone: () => void) => {
      if (finalPerks.length !== 4) return;
      clearTimers();
      setIsSpinning(true);
      setLandedMask([false, false, false, false]);

      finalPerks.forEach((_, reelIndex) => {
        const spinMs = REEL_SPIN_MS[reelIndex];
        const stepMs = spinMs / FLASH_STEPS;

        for (let step = 0; step < FLASH_STEPS; step += 1) {
          const t = setTimeout(() => {
            const flashPerk = finalPerks[(reelIndex + step) % finalPerks.length];
            setReelDisplay((prev) => {
              const next = [...prev];
              next[reelIndex] = flashPerk;
              return next;
            });
          }, step * stepMs);
          timeoutsRef.current.push(t);
        }

        const landTimer = setTimeout(() => {
          setReelDisplay((prev) => {
            const next = [...prev];
            next[reelIndex] = finalPerks[reelIndex];
            return next;
          });
          setLandedMask((prev) => {
            const next = [...prev];
            next[reelIndex] = true;
            return next;
          });
          if (reelIndex === finalPerks.length - 1) {
            setIsSpinning(false);
            onDone();
          }
        }, spinMs);
        timeoutsRef.current.push(landTimer);
      });
    },
    [finalPerks]
  );

  return { isSpinning, reelDisplay, landedMask, start };
}
