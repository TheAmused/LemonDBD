// frontend/src/components/streaks/page-streak/usePageStreakRun.ts
'use client';

import { useCallback } from 'react';
import type { PageStreakRun, PageStreakStats } from '@/types/pageStreak';
import * as api from '@/services/pageStreakApi';
import { useChallengeRun } from '../useChallengeRun';
import { reportAbandon, reportMatchResult } from '../challengeTracking';
import { pageStreakProgress } from '../challengeRunProgress';

export function usePageStreakRun(killer: string) {
  const { token, run, stats, completions, loading, busy, error, errorStatus, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<PageStreakRun, PageStreakStats>({
      scope: killer,
      label: 'page streak',
      fetchRun: (t) => api.fetchRun(t, killer),
      fetchStats: (t) => api.fetchStats(t, killer),
      fetchCompletions: async (t) => (await api.fetchCompletions(t, killer)).completions,
    });

  const startRun = useCallback(async () => {
    if (token) await mutate(() => api.startRun(token, killer));
  }, [token, killer, mutate]);

  const lockPages = useCallback(async () => {
    if (!token) return undefined;
    return mutate(() => api.lockPages(token, killer));
  }, [token, killer, mutate]);

  const submitResult = useCallback(
    async (page: number, perks: string[], result: 'win' | 'loss') => {
      if (!token || !run) return;
      const updated = await mutate(() => api.submitResult(token, killer, page, perks, result));
      if (!updated) return;
      reportMatchResult({ challenge: 'page_streak', role: 'killer', variant: killer }, pageStreakProgress(run), pageStreakProgress(updated), result);
      void loadStats();
      if (updated.status === 'completed') void loadCompletions();
    },
    [token, killer, run, mutate, loadStats, loadCompletions]
  );

  const abandonRun = useCallback(async () => {
    if (!token) return;
    const updated = await mutate(() => api.abandonRun(token, killer));
    if (updated && run) reportAbandon({ challenge: 'page_streak', role: 'killer', variant: killer }, pageStreakProgress(run));
  }, [token, killer, run, mutate]);

  return { run, stats, completions, loading, busy, error, errorStatus, reload: load, startRun, lockPages, submitResult, abandonRun };
}
