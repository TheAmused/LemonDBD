'use client';
// frontend/src/hooks/useOnceInBrowser.ts

import { useState } from 'react';
import { useIsClient } from '@/hooks/useIsClient';

/**
 * Runs `run` once, during the first render in the browser after hydration: for state that starts
 * from something only the browser has (localStorage, the URL fragment). The server render and the
 * hydrating render keep their defaults, so they agree; `run` may only set state of this component.
 * Returns whether it has run.
 */
export function useOnceInBrowser(run: () => void): boolean {
  const isClient = useIsClient();
  const [done, setDone] = useState(false);
  if (isClient && !done) {
    setDone(true);
    run();
  }
  return done || isClient;
}
