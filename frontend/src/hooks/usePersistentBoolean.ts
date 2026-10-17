'use client';
// frontend/src/hooks/usePersistentBoolean.ts

import { useState, useEffect, useCallback } from 'react';

/**
 * Persists an on/off choice (a filter chip) in localStorage, same pattern as usePersistentString.
 * For a fold-away section use usePersistentDrawer, which also offers a toggle.
 */
export function usePersistentBoolean(storageKey: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(defaultValue);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'true' || saved === 'false') setValue(saved === 'true');
    } catch {
      // Storage unavailable (private mode / sandboxed iframe) - keep default state
    }
  }, [storageKey]);

  const setPersistent = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setValue((prev) => {
        const next = typeof val === 'function' ? val(prev) : val;
        try {
          localStorage.setItem(storageKey, String(next));
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
