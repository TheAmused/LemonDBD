// frontend/src/hooks/usePersistentString.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to persist a simple string choice (e.g. a selected category key) in
 * localStorage, same pattern as usePersistentDrawer.
 *
 * Seeds initial state with defaultValue so SSR and initial client hydration
 * match, then reconciles with localStorage on mount. `isValid` guards
 * against applying a stale value that no longer matches the current set of
 * choices (e.g. after a dataset change), falling back to defaultValue.
 */
export function usePersistentString<T extends string>(
  storageKey: string,
  defaultValue: T,
  isValid?: (value: string) => value is T
) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null && (!isValid || isValid(saved))) {
        setValue(saved as T);
      }
    } catch {
      // Storage unavailable (private mode / sandboxed iframe) - keep default state
    }
    // Only re-check when the key itself changes (e.g. a role-scoped key
    // switching character role) — not on every isValid identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setPersistent = useCallback(
    (val: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof val === 'function' ? (val as (prev: T) => T)(prev) : val;
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Non-fatal if localStorage is restricted
        }
        return next;
      });
    },
    [storageKey]
  );

  return [value, setPersistent] as const;
}
