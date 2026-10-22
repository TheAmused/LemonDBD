'use client';
// frontend/src/hooks/usePersistentBoolean.ts

import { useCallback } from 'react';
import { readStoredItem, useStoredItem } from '@/hooks/useStoredItem';

const parse = (raw: string | null, fallback: boolean) => (raw === 'true' ? true : raw === 'false' ? false : fallback);

/**
 * Persists an on/off choice (a filter chip) in localStorage, same pattern as usePersistentString.
 * For a fold-away section use usePersistentDrawer, which also offers a toggle.
 */
export function usePersistentBoolean(storageKey: string, defaultValue: boolean) {
  const [saved, write] = useStoredItem(storageKey);
  const value = parse(saved, defaultValue);

  const setPersistent = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof val === 'function' ? val(parse(readStoredItem(storageKey), defaultValue)) : val;
      write(String(next));
    },
    [storageKey, defaultValue, write]
  );

  return [value, setPersistent] as const;
}
