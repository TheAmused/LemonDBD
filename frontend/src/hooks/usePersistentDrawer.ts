// frontend/src/hooks/usePersistentDrawer.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to persist the expanded / collapsed state of an accordion drawer in localStorage.
 *
 * Seeds initial state with defaultOpen so SSR and initial client hydration match,
 * then reconciles with localStorage on mount.
 */
export function usePersistentDrawer(storageKey: string, defaultOpen: boolean = false) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    } catch {
      // Storage unavailable (private mode / sandboxed iframe) - keep default state
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Non-fatal if localStorage is restricted
      }
      return next;
    });
  }, [storageKey]);

  const setExpanded = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsExpanded((prev) => {
        const next = typeof val === 'function' ? val(prev) : val;
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {
          // Non-fatal
        }
        return next;
      });
    },
    [storageKey]
  );

  return [isExpanded, toggle, setExpanded] as const;
}
