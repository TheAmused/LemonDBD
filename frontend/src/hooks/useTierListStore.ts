// frontend/src/hooks/useTierListStore.ts
'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { TierListStoreState } from '@/types/tierList';
import {
  claimUnownedCustomLists,
  getTierListServerSnapshot,
  getTierListSnapshot,
  ownedTierListState,
  setTierListOwner,
  subscribeTierListStore,
} from '@/utils/tierLists/storage';

const noopSubscribe = () => () => {};

/**
 * The user's saved rankings and THEIR custom lists. Renders the empty state on the
 * server and during hydration, then the stored state -- no mismatch warning,
 * and every component using it updates on any write, in this tab or another.
 *
 * Custom lists are filtered to the signed-in account (a browser may be shared); lists
 * saved before lists had owners are claimed by the first account that signs in.
 */
export function useTierListStore(): { state: TierListStoreState; hydrated: boolean } {
  const { user } = useAuth();
  const userId = typeof user?.id === 'number' ? user.id : null;
  const raw = useSyncExternalStore(subscribeTierListStore, getTierListSnapshot, getTierListServerSnapshot);
  // False on the server and during the hydration render, true afterwards:
  // lets a page tell "nothing saved" apart from "not read yet".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    setTierListOwner(userId);
    if (userId !== null && hydrated) claimUnownedCustomLists(userId);
  }, [userId, hydrated]);

  const state = useMemo(() => ownedTierListState(raw, userId), [raw, userId]);
  return { state, hydrated };
}
