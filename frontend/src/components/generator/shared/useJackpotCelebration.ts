// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { playFanfare } from '@/utils/perkAudio';
import { triggerDbdBurst } from '../lib/dbdBurst';
import { Dictionary } from '@/locales/types';
import { RoleCategory } from '@/types/perks';

const DEFAULT_JACKPOT_LINES: readonly string[] = [
  'The Entity approves.',
  'Hooked. Lined. Sinkered.',
  'The Fog whispers your name.',
];

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
      const lines = dict?.generator?.jackpotLines || DEFAULT_JACKPOT_LINES;
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
