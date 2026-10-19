'use client';
// frontend/src/hooks/useCustomChallenges.ts
import { useCallback, useEffect, useState } from 'react';
import type { ChallengeDefinition } from '@/types/minigame';
import { CUSTOM_CHALLENGES_KEY, deleteCustomChallenge, getCustomChallenges } from '@/utils/minigames/storage';

type TrialId = string | number;

/**
 * The trials saved in this browser, kept in step with storage: a write from another tab, or the
 * moderation sweep deleting a banned trial, announces itself with a `storage` event and the list
 * re-reads. Deleting goes through a confirmation (`requestDelete`, then `confirmDelete`).
 */
export function useCustomChallenges() {
  const [trials, setTrials] = useState<ChallengeDefinition[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<TrialId | null>(null);
  const reload = useCallback(() => setTrials(getCustomChallenges()), []);

  useEffect(() => {
    reload();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CUSTOM_CHALLENGES_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  const confirmDelete = useCallback(() => {
    if (pendingDeleteId === null) return;
    deleteCustomChallenge(pendingDeleteId);
    reload();
    setPendingDeleteId(null);
  }, [pendingDeleteId, reload]);

  return {
    trials,
    reload,
    pendingDeleteId,
    requestDelete: setPendingDeleteId as (id: TrialId) => void,
    cancelDelete: useCallback(() => setPendingDeleteId(null), []),
    confirmDelete,
  };
}
