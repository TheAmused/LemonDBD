'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { playFanfare } from '@/utils/perkAudio';
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

  const celebrate = useCallback(
    (role: RoleCategory) => {
      const lines = dict?.generator?.jackpotLines || DEFAULT_JACKPOT_LINES;
      const line = lines[Math.floor(Math.random() * lines.length)];
      setFlavorLine(line);

      playFanfare();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: role === 'Survivor'
            ? ['#10b981', '#34d399', '#f59e0b']
            : ['#f43f5e', '#fb7185', '#f59e0b'],
        });
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlavorLine(null), FLAVOR_DISPLAY_MS);
    },
    [dict]
  );

  return { flavorLine, celebrate };
}
