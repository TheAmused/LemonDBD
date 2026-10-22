'use client';
// frontend/src/hooks/usePersistentNumber.ts

import { useCallback } from 'react';
import { useStoredItem } from '@/hooks/useStoredItem';

/**
 * Persists a numeric choice (a page size, a zoom step) in localStorage, same pattern as
 * usePersistentString. Only a value listed in `allowed` is applied, so a size the picker no longer
 * offers falls back to the default instead of showing as a blank select.
 */
export function usePersistentNumber<T extends number>(storageKey: string, defaultValue: T, allowed: readonly T[]) {
  const [saved, write] = useStoredItem(storageKey);
  const value = (saved === null ? undefined : allowed.find((option) => option === Number(saved))) ?? defaultValue;

  const setPersistent = useCallback((next: T) => write(String(next)), [write]);

  return [value, setPersistent] as const;
}
