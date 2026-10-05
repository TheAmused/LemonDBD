'use client';
// frontend/src/components/streaks/gauntlet/TokenRoulette.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { playReelThud, playReelTick } from '@/utils/perkAudio';

/** Every amount a win can roll. Mirrors TOKEN_ROLLS in the backend. */
const ROLL_AMOUNTS = [1, 2, 3, 5];
/** Numbers that flash past before the rolled one comes to rest. */
const FILLER_CELLS = 18;
const SPIN_MS = 2400;
const REDUCED_SPIN_MS = 220;
/** Same ticking cadence and braking curve as the perk slot machine's reels. */
const TICK_MS = 90;
const EASE = 'cubic-bezier(0.13,0.82,0.22,1)';
/** Beat spent on the landed number before the roll counts as done. */
const HOLD_MS = 900;
/** Lets the strip paint at rest once before it starts to move. */
const START_DELAY_MS = 50;

/** Random amounts with no number twice in a row, ending on the rolled one. */
function buildStrip(roll: number): number[] {
  const cells: number[] = [];
  for (let i = 0; i < FILLER_CELLS; i += 1) {
    const choices = ROLL_AMOUNTS.filter((amount) => amount !== cells[i - 1]);
    cells.push(choices[Math.floor(Math.random() * choices.length)]);
  }
  cells.push(roll);
  return cells;
}

interface TokenRouletteProps {
  /** What the server rolled; the reel only animates toward it. */
  roll: number;
  /** Called once the reel has landed and held for a moment. */
  onDone: () => void;
}

export const TokenRoulette: React.FC<TokenRouletteProps> = ({ roll, onDone }) => {
  const reduceMotion = useReducedMotion();
  const strip = useMemo(() => buildStrip(roll), [roll]);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  // The parent hands a fresh callback each render; the reel must run once per roll, not once per render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const spinMs = reduceMotion ? REDUCED_SPIN_MS : SPIN_MS;

  useEffect(() => {
    let ticks = 0;
    const ticker = setInterval(() => {
      ticks += 1;
      playReelTick(1 + ticks * 0.03);
    }, TICK_MS);
    const start = setTimeout(() => setSpinning(true), START_DELAY_MS);
    const land = setTimeout(() => {
      clearInterval(ticker);
      playReelThud();
      setLanded(true);
    }, START_DELAY_MS + spinMs);
    const done = setTimeout(() => onDoneRef.current(), START_DELAY_MS + spinMs + HOLD_MS);
    return () => {
      clearInterval(ticker);
      clearTimeout(start);
      clearTimeout(land);
      clearTimeout(done);
    };
  }, [spinMs]);

  const restOffset = ((strip.length - 1) / strip.length) * 100;

  return (
    <div
      role="img"
      aria-label={String(roll)}
      className={`relative box-content h-24 w-36 overflow-hidden rounded-2xl border-2 border-accent-amber/60 bg-bg-elevated shadow-inner ${
        landed ? 'gn-land-glow' : ''
      }`}
    >
      <div
        className="flex flex-col"
        style={{
          transform: spinning ? `translateY(-${restOffset}%)` : 'translateY(0)',
          transition: spinning ? `transform ${spinMs}ms ${EASE}` : 'none',
        }}
      >
        {strip.map((amount, index) => (
          <div key={index} className="flex h-24 items-center justify-center text-5xl font-black text-accent-amber">
            +{amount}
          </div>
        ))}
      </div>
    </div>
  );
};
