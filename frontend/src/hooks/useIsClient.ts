'use client';
// frontend/src/hooks/useIsClient.ts

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during the server render and hydration, true from then on: for content that can only
 * exist in the browser (portals into document.body, window-sized layout). Unlike setting a
 * "mounted" flag in an effect, it costs no extra render once the page is running.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
