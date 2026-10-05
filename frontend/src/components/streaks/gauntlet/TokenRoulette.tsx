'use client';
// frontend/src/components/streaks/gauntlet/TokenRoulette.tsx

import React, { useEffect, useRef } from 'react';
import { useTargetDraw } from './useTargetDraw';

/** Every amount a win can roll, in the order the reel walks them. Mirrors TOKEN_ROLLS in the backend. */
const ROLL_POOL = ['1', '2', '3', '5'];

interface TokenRouletteProps {
  /** What the server rolled; the reel only animates toward it. */
  roll: number;
  onDone: () => void;
  /** The big version shown on its own in the roll modal. */
  large?: boolean;
}

export const TokenRoulette: React.FC<TokenRouletteProps> = ({ roll, onDone, large = false }) => {
  const { displayName, phase, start } = useTargetDraw(ROLL_POOL, String(roll));
  // The parent hands a fresh callback each render; the reel must start once per roll, not once per render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    start(() => onDoneRef.current());
  }, [start]);

  return (
    <span
      aria-live="polite"
      className={`inline-flex justify-center rounded-lg border border-accent-amber/40 bg-accent-amber/15 font-black text-accent-amber ${
        large ? 'min-w-[7rem] px-6 py-2 text-5xl' : 'min-w-[2.5rem] px-2 py-0.5 text-sm'
      } ${phase === 'landed' ? 'gn-land-glow' : ''}`}
    >
      +{displayName ?? roll}
    </span>
  );
};
