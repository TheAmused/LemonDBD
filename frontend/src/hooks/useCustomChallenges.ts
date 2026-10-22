'use client';
// frontend/src/hooks/useCustomChallenges.ts
import { useCallback, useMemo, useState } from 'react';
import type { ChallengeDefinition } from '@/types/minigame';
import { CUSTOM_CHALLENGES_KEY, deleteCustomChallenge, parseCustomChallenges } from '@/utils/minigames/storage';
import { refreshStoredItems, useStoredItem } from '@/hooks/useStoredItem';

type TrialId = string | number;

/**
 * The trials saved in this browser, kept in step with storage (useStoredItem): a write from another
 * tab, or the moderation sweep deleting a banned trial, announces itself with a `storage` event and
 * the list re-reads; `reload` re-reads after a save in this tab. Deleting goes through a
 * confirmation (`requestDelete`, then `confirmDelete`).
 */
export function useCustomChallenges() {
  const [stored] = useStoredItem(CUSTOM_CHALLENGES_KEY);
  const trials = useMemo<ChallengeDefinition[]>(() => parseCustomChallenges(stored), [stored]);
  const [pendingDeleteId, setPendingDeleteId] = useState<TrialId | null>(null);
  const reload = refreshStoredItems;

  const confirmDelete = useCallback(() => {
    if (pendingDeleteId === null) return;
    deleteCustomChallenge(pendingDeleteId);
    refreshStoredItems();
    setPendingDeleteId(null);
  }, [pendingDeleteId]);

  return {
    trials,
    reload,
    pendingDeleteId,
    requestDelete: setPendingDeleteId as (id: TrialId) => void,
    cancelDelete: useCallback(() => setPendingDeleteId(null), []),
    confirmDelete,
  };
}
