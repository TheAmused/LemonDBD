'use client';

// frontend/src/hooks/usePersistentDrawer.ts

import { useCallback } from 'react';
import { readStoredItem, useStoredItem } from '@/hooks/useStoredItem';

const parse = (raw: string | null, fallback: boolean) => (raw === null ? fallback : raw === 'true');

/**
 * Hook to persist the expanded / collapsed state of an accordion drawer in localStorage.
 *
 * The server render and hydration use defaultOpen (useStoredItem), then the stored state takes over.
 */
export function usePersistentDrawer(storageKey: string, defaultOpen: boolean = false) {
  const [saved, write] = useStoredItem(storageKey);
  const isExpanded = parse(saved, defaultOpen);

  const setExpanded = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof val === 'function' ? val(parse(readStoredItem(storageKey), defaultOpen)) : val;
      write(String(next));
    },
    [storageKey, defaultOpen, write]
  );

  const toggle = useCallback(() => setExpanded((prev) => !prev), [setExpanded]);

  return [isExpanded, toggle, setExpanded] as const;
}
