// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playFanfare } from '@/utils/perkAudio';
import { triggerDbdBurst } from '../lib/dbdBurst';
import { Dictionary } from '@/locales/types';
import { RoleCategory } from '@/types/perks';

export const DEFAULT_SURVIVOR_JACKPOT_LINES: readonly string[] = [
  'The Entity approves.',
  'Hooked. Lined. Sinkered.',
  'The Fog whispers your name.',
];

export const DEFAULT_KILLER_JACKPOT_LINES: readonly string[] = [
  'The Entity is pleased. 4K incoming.',
  'No one escapes the Fog.',
  'Hooks are primed. Let the hunt begin.',
];

export const DEFAULT_JACKPOT_LINES: readonly string[] = DEFAULT_SURVIVOR_JACKPOT_LINES;

export function getJackpotCelebrationLines(
  dict?: Dictionary,
  role?: RoleCategory
): readonly string[] {
  if (role === 'Killer') {
    const killerLines = dict?.generator?.jackpotLinesKiller;
    return killerLines && killerLines.length > 0
      ? killerLines
      : DEFAULT_KILLER_JACKPOT_LINES;
  }
  const survivorLines = dict?.generator?.jackpotLines;
  return survivorLines && survivorLines.length > 0
    ? survivorLines
    : DEFAULT_SURVIVOR_JACKPOT_LINES;
}

const FLAVOR_DISPLAY_MS = 4000;

export function useJackpotCelebration(dict?: Dictionary) {
  const [flavorLine, setFlavorLine] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /**
   * `originEl` should be the actual on-screen element the result appeared
   * in (a results-grid wrapper, the wheel canvas, etc.) so the particle
   * burst is anchored to where the win really is instead of a fixed
   * viewport-relative point. Falls back to the viewport center if omitted.
   */
  const celebrate = useCallback(
    (role: RoleCategory, originEl?: HTMLElement | null) => {
      const lines = getJackpotCelebrationLines(dict, role);
      const line = lines[Math.floor(Math.random() * lines.length)];
      setFlavorLine(line);

      playFanfare();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        triggerDbdBurst(originEl ?? null, role);
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlavorLine(null), FLAVOR_DISPLAY_MS);
    },
    [dict]
  );

  return { flavorLine, celebrate };
}
