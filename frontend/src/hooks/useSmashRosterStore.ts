// frontend/src/hooks/useSmashRosterStore.ts
'use client';

import { useSyncExternalStore } from 'react';
import type { SmashRosterStoreState } from '@/types/smashOrPass';
import {
  getSmashRosterServerSnapshot,
  getSmashRosterSnapshot,
  subscribeSmashRosterStore,
} from '@/utils/smashOrPass/storage';

const noopSubscribe = () => () => {};

/**
 * The user's own saved smash-or-pass rosters. Renders the empty state on the
 * server and during hydration, then the stored state -- no mismatch warning,
 * and every component using it updates on any write, in this tab or another.
 */
export function useSmashRosterStore(): { state: SmashRosterStoreState; hydrated: boolean } {
  const state = useSyncExternalStore(subscribeSmashRosterStore, getSmashRosterSnapshot, getSmashRosterServerSnapshot);
  // False on the server and during the hydration render, true afterwards:
  // lets a page tell "nothing saved" apart from "not read yet".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { state, hydrated };
}
