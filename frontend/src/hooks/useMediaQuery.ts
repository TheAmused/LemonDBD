// frontend/src/hooks/useMediaQuery.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Whether a CSS media query matches, kept live. `null` until the first client effect (SSR and first
 * paint), so a caller can tell "not known yet" from "no" and avoid acting on a guess.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}
