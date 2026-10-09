// frontend/src/components/streaks/history/useHistoryRun.ts
'use client';

import { useCallback } from 'react';
import { HistoryMode, HistoryRun, HistoryStats } from '@/types/historyStreak';
import * as api from '@/services/historyStreakApi';
import { useChallengeRun } from '../useChallengeRun';

export function useHistoryRun(mode: HistoryMode) {
  const { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<HistoryRun, HistoryStats>({
      scope: mode,
      label: 'history',
      fetchRun: (t) => api.fetchHistoryRun(t, mode),
      fetchStats: (t) => api.fetchHistoryStats(t, mode),
      fetchCompletions: async (t) => (await api.fetchHistoryCompletions(t, mode)).completions,
    });

  const submitResult = useCallback(
    async (result: 'win' | 'loss', killerId: string) => {
      if (!token || !run) return undefined;
      const updated = await mutate(
        () => api.submitHistoryResult(token, run.id, result, killerId),
        'Failed to record the result'
      );
      if (!updated) return undefined;
      loadStats();
      if (updated.status === 'completed') loadCompletions();
      return updated;
    },
    [token, run, mutate, loadStats, loadCompletions]
  );

  const abandon = useCallback(async () => {
    if (!token) return;
    await mutate(() => api.abandonHistoryRun(token, mode));
  }, [token, mode, mutate]);

  return { run, stats, completions, loading, busy, error, submitResult, abandon, reload: load };
}
