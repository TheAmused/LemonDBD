// frontend/src/hooks/usePersistentString.ts
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readStoredItem, useStoredItem } from '@/hooks/useStoredItem';

function resolve<T extends string>(raw: string | null, fallback: T, isValid?: (value: string) => value is T): T {
  return raw !== null && (!isValid || isValid(raw)) ? (raw as T) : fallback;
}

/**
 * Hook to persist a simple string choice (e.g. a selected category key) in
 * localStorage, same pattern as usePersistentDrawer.
 *
 * The server render and hydration use defaultValue (useStoredItem), then the
 * stored value takes over. `isValid` guards against applying a stale value
 * that no longer matches the current set of choices (e.g. after a dataset
 * change), falling back to defaultValue.
 */
export function usePersistentString<T extends string>(
  storageKey: string,
  defaultValue: T,
  isValid?: (value: string) => value is T
) {
  const [saved, write] = useStoredItem(storageKey);
  const value = resolve(saved, defaultValue, isValid);

  // The setter stays stable across renders (callers pass isValid inline), so it reads the
  // latest validator from a ref the effect below keeps current.
  const latest = useRef({ defaultValue, isValid });
  useEffect(() => {
    latest.current = { defaultValue, isValid };
  });

  const setPersistent = useCallback(
    (val: T | ((prev: T) => T)) => {
      const { defaultValue: fallback, isValid: valid } = latest.current;
      const next = typeof val === 'function' ? val(resolve(readStoredItem(storageKey), fallback, valid)) : val;
      write(next);
    },
    [storageKey, write]
  );

  return [value, setPersistent] as const;
}
