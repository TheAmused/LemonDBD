// frontend/src/components/streaks/history/useHistoryRun.ts
'use client';

import { useCallback } from 'react';
import type { HistoryMode, HistoryRun, HistoryStats } from '@/types/historyStreak';
import * as api from '@/services/historyStreakApi';
import { useChallengeRun } from '../useChallengeRun';
import { reportAbandon, reportMatchResult } from '../challengeTracking';
import { historyProgress } from '../challengeRunProgress';

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
      reportMatchResult({ challenge: 'history', role: 'killer', variant: mode }, historyProgress(run), historyProgress(updated), result);
      void loadStats();
      if (updated.status === 'completed') void loadCompletions();
      return updated;
    },
    [token, run, mode, mutate, loadStats, loadCompletions]
  );

  const abandon = useCallback(async () => {
    if (!token) return;
    const updated = await mutate(() => api.abandonHistoryRun(token, mode));
    if (updated && run) reportAbandon({ challenge: 'history', role: 'killer', variant: mode }, historyProgress(run));
  }, [token, mode, run, mutate]);

  return { run, stats, completions, loading, busy, error, submitResult, abandon, reload: load };
}
