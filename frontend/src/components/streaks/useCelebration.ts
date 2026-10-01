// frontend/src/components/streaks/useCelebration.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFETTI_LIFETIME_MS } from './Confetti';

/** Drives a board's <Confetti active>: `celebrate()` turns it on for one burst's lifetime. */
export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCelebrating(true);
    timerRef.current = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { celebrating, celebrate };
}

/** Celebrates once each time `active` flips to true, not on every later render or reload. */
export function useCelebrateOnRise(active: boolean, celebrate: () => void) {
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (active && !wasActiveRef.current) celebrate();
    wasActiveRef.current = active;
  }, [active, celebrate]);
}
