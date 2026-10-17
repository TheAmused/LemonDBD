'use client';
// frontend/src/hooks/usePersistentNumber.ts

import { useState, useEffect, useCallback } from 'react';

/**
 * Persists a numeric choice (a page size, a zoom step) in localStorage, same pattern as
 * usePersistentString. Only a value listed in `allowed` is applied, so a size the picker no longer
 * offers falls back to the default instead of showing as a blank select.
 */
export function usePersistentNumber<T extends number>(storageKey: string, defaultValue: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      const match = allowed.find((option) => option === saved);
      if (match !== undefined) setValue(match);
    } catch {
      // Storage unavailable (private mode / sandboxed iframe) - keep default state
    }
  }, [storageKey, allowed]);

  const setPersistent = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Non-fatal if localStorage is restricted
      }
    },
    [storageKey]
  );

  return [value, setPersistent] as const;
}
