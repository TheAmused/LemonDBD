// frontend/src/components/streaks/chaos/useOwnedKillers.ts
'use client';

import { useMemo } from 'react';
import { useOwnedRoster } from '../useOwnedRoster';

/** Owned killer names in release order (thin wrapper over the shared roster hook). */
export function useOwnedKillers() {
  const { characters, loading, releaseOrder, reload } = useOwnedRoster('Killer');
  const killers = useMemo(() => characters.map((c) => c.name), [characters]);
  return { killers, loading, releaseOrder, reload };
}
