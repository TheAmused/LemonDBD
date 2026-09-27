// frontend/src/hooks/useTierListStore.ts
'use client';

import { useSyncExternalStore } from 'react';
import type { TierListStoreState } from '@/types/tierList';
import {
  getTierListServerSnapshot,
  getTierListSnapshot,
  subscribeTierListStore,
} from '@/utils/tierLists/storage';

const noopSubscribe = () => () => {};

/**
 * The user's saved rankings and custom lists. Renders the empty state on the
 * server and during hydration, then the stored state -- no mismatch warning,
 * and every component using it updates on any write, in this tab or another.
 */
export function useTierListStore(): { state: TierListStoreState; hydrated: boolean } {
  const state = useSyncExternalStore(subscribeTierListStore, getTierListSnapshot, getTierListServerSnapshot);
  // False on the server and during the hydration render, true afterwards:
  // lets a page tell "nothing saved" apart from "not read yet".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { state, hydrated };
}
