// frontend/src/hooks/useFinePointer.ts
'use client';

import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

/**
 * True when the primary input can hover precisely (mouse / trackpad), i.e. a
 * desktop. False on phones and tablets, and during SSR / first paint so the
 * touch-friendly UI is the safe default.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return fine;
}
