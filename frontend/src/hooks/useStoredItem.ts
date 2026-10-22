'use client';
// frontend/src/hooks/useStoredItem.ts

import { useCallback, useSyncExternalStore } from 'react';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/utils/safeStorage';

/**
 * One localStorage entry as React state, read through useSyncExternalStore: the server render
 * and hydration see `null` (so they agree), the client then reads storage, and every hook on
 * the same key (and other tabs, via the `storage` event) stays in step. A write storage refuses
 * (private mode, quota) still updates the page for this visit from an in-memory copy.
 */
const listeners = new Set<() => void>();
const unsaved = new Map<string, string | null>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function read(key: string): string | null {
  return unsaved.has(key) ? (unsaved.get(key) ?? null) : safeGetItem(key);
}

export function writeStoredItem(key: string, value: string | null): void {
  const saved = value === null ? safeRemoveItem(key) : safeSetItem(key, value);
  if (saved) unsaved.delete(key);
  else unsaved.set(key, value);
  listeners.forEach((listener) => listener());
}

export function useStoredItem(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
  const set = useCallback((next: string | null) => writeStoredItem(key, next), [key]);
  return [value, set];
}

/**
 * Re-reads every watched key: for code that writes localStorage directly (a storage module's own
 * save or delete) and wants this tab's hooks to see it, as other tabs do through the storage event.
 */
export function refreshStoredItems(): void {
  listeners.forEach((listener) => listener());
}

/** The current stored string for `key`, outside React (for functional updates). */
export function readStoredItem(key: string): string | null {
  return read(key);
}
