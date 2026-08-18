'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Roughly how long a draw takes, whatever the pool size. */
const TOTAL_MS = 2200;
/** Enough frames that a short pool still reads as a reel rather than a jump. */
const MIN_STEPS = 14;
const MAX_STEPS = 60;
/** Higher = the reel holds its fast pace longer before braking. */
const EASE_POWER = 2.6;
/** Beat spent on the drawn character before the match card replaces the reel. */
const HOLD_MS = 1100;

/** idle: nothing running. spinning: reel moving. landed: holding on the pick. */
export type DrawPhase = 'idle' | 'spinning' | 'landed';

/**
 * Frame delays that add up to TOTAL_MS while getting steadily longer, so the
 * reel spins fast at first and crawls into its final name.
 */
function easedDelays(steps: number): number[] {
  const weights = Array.from({ length: steps }, (_, i) =>
    0.12 + Math.pow(steps === 1 ? 1 : i / (steps - 1), EASE_POWER)
  );
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => (w / total) * TOTAL_MS);
}

/**
 * Spins through `pool` in order and stops on `target`.
 *
 * The reel walks the pool front to back (wrapping if it needs more frames), so
 * the names go past in roster order rather than jumping around at random.
 */
export function useTargetDraw(pool: string[], target: string) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [phase, setPhase] = useState<DrawPhase>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => clear, []);

  const start = useCallback(
    (onDone?: () => void) => {
      const targetIdx = pool.indexOf(target);
      if (pool.length === 0 || targetIdx < 0) {
        onDone?.();
        return;
      }

      // Land exactly on the target: index i shows pool[i % pool.length], so the
      // last frame must sit at targetIdx. Add whole passes until it feels long enough.
      let steps = targetIdx + 1;
      while (steps < MIN_STEPS && steps + pool.length <= MAX_STEPS) {
        steps += pool.length;
      }
      const delays = easedDelays(steps);

      clear();
      setPhase('spinning');

      let i = 0;
      const tick = () => {
        setDisplayName(pool[i % pool.length]);
        i += 1;
        if (i >= steps) {
          // Hold on the drawn name so it registers before the card takes over.
          setPhase('landed');
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            setPhase('idle');
            onDone?.();
          }, HOLD_MS);
          return;
        }
        timeoutRef.current = setTimeout(tick, delays[i]);
      };
      tick();
    },
    [pool, target]
  );

  return { displayName, phase, isDrawing: phase !== 'idle', start };
}
