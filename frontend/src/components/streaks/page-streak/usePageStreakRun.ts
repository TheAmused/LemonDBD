// frontend/src/components/streaks/page-streak/usePageStreakRun.ts
'use client';

import { useCallback } from 'react';
import { PageStreakRun, PageStreakStats } from '@/types/pageStreak';
import * as api from '@/services/pageStreakApi';
import { useChallengeRun } from '../useChallengeRun';

export function usePageStreakRun(killer: string) {
  const { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<PageStreakRun, PageStreakStats>({
      scope: killer,
      label: 'page streak',
      fetchRun: (t) => api.fetchRun(t, killer),
      fetchStats: (t) => api.fetchStats(t),
      fetchCompletions: async (t) => (await api.fetchCompletions(t, killer)).completions,
    });

  const startRun = useCallback(async () => {
    if (token) await mutate(() => api.startRun(token, killer));
  }, [token, killer, mutate]);

  const submitResult = useCallback(
    async (page: number, perks: string[], result: 'win' | 'loss') => {
      if (!token) return;
      const updated = await mutate(() => api.submitResult(token, killer, page, perks, result));
      if (!updated) return;
      loadStats();
      if (updated.status === 'completed') loadCompletions();
    },
    [token, killer, mutate, loadStats, loadCompletions]
  );

  const resetRun = useCallback(async () => {
    if (token) await mutate(() => api.resetRun(token, killer));
  }, [token, killer, mutate]);

  return { run, stats, completions, loading, busy, error, reload: load, startRun, submitResult, resetRun };
}
