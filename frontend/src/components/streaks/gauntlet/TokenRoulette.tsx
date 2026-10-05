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
}

export const TokenRoulette: React.FC<TokenRouletteProps> = ({ roll, onDone }) => {
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
      className={`inline-flex min-w-[2.5rem] justify-center rounded-lg border border-accent-amber/40 bg-accent-amber/15 px-2 py-0.5 text-sm font-black text-accent-amber ${
        phase === 'landed' ? 'gn-land-glow' : ''
      }`}
    >
      +{displayName ?? roll}
    </span>
  );
};
