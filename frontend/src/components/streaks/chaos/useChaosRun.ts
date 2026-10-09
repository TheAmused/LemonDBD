// frontend/src/components/streaks/chaos/useChaosRun.ts
'use client';

import { useCallback } from 'react';
import { ChaosRun, ChaosStats, Difficulty } from '@/types/chaosStreak';
import * as api from '@/services/chaosStreakApi';
import { useBankedCheckpoint, useChallengeRun } from '../useChallengeRun';

export function useChaosRun(difficulty: Difficulty) {
  const { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<ChaosRun, ChaosStats>({
      scope: difficulty,
      label: 'chaos',
      fetchRun: (t) => api.fetchChaosRun(t, difficulty),
      fetchStats: (t) => api.fetchChaosStats(t, difficulty),
      fetchCompletions: async (t) => (await api.fetchChaosCompletions(t, difficulty)).completions,
    });
  const { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration } = useBankedCheckpoint();

  const submitResult = useCallback(
    async (result: 'win' | 'loss', killerId: string, options?: { silent?: boolean }) => {
      if (!token || !run) return undefined;
      const checkpointBefore = run.last_checkpoint_streak;
      const updated = await mutate(
        () => api.submitChaosResult(token, run.id, result, killerId),
        'Failed to record the result'
      );
      if (!updated) return undefined;
      const justFinished = updated.status === 'completed';
      loadStats();
      if (justFinished) loadCompletions();
      if (!options?.silent && result === 'win' && !justFinished && updated.last_checkpoint_streak > checkpointBefore) {
        setJustBankedCheckpoint(updated.last_checkpoint_streak);
      }
      return updated;
    },
    [token, run, mutate, loadStats, loadCompletions, setJustBankedCheckpoint]
  );

  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealChaosBuild(token, run.id));
  }, [token, run, mutate]);

  const abandon = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    return mutate(() => api.abandonChaosRun(token, difficulty));
  }, [token, difficulty, mutate, setJustBankedCheckpoint]);

  return {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    reload: load,
    submitResult,
    reveal,
    abandon,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  };
}
