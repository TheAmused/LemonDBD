// frontend/src/components/streaks/page-streak/usePageStreakRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageStreakRun, PageStreakStats } from '@/types/pageStreak';
import { ChallengeCompletion } from '@/types/challengeCompletion';
import * as api from '@/services/pageStreakApi';
import { useAuth } from '@/context/AuthContext';

export function usePageStreakRun(killer: string) {
  const { token } = useAuth();
  const [run, setRun] = useState<PageStreakRun | null>(null);
  const [stats, setStats] = useState<PageStreakStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      setStats(await api.fetchStats(token));
    } catch (err) {
      console.error('Failed to load page streak stats:', err);
    }
  }, [token]);

  const loadCompletions = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await api.fetchCompletions(token, killer);
      setCompletions(resp.completions);
    } catch (err) {
      console.error('Failed to load page streak completion history:', err);
    }
  }, [token, killer]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRun(await api.fetchRun(token, killer));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this streak');
    } finally {
      setLoading(false);
    }
  }, [killer, token]);

  useEffect(() => {
    load();
    loadStats();
    loadCompletions();
  }, [load, loadStats, loadCompletions]);

  const mutate = useCallback(
    async (action: () => Promise<PageStreakRun>, reloadStatsAfter: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await action();
        setRun(updated);
        if (reloadStatsAfter) loadStats();
        if (updated.status === 'completed') loadCompletions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through — try again');
      } finally {
        setBusy(false);
      }
    },
    [loadStats, loadCompletions]
  );

  return {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    reload: load,
    startRun: () => token && mutate(() => api.startRun(token, killer), false),
    submitResult: (page: number, perks: string[], result: 'win' | 'loss') =>
      token && mutate(() => api.submitResult(token, killer, page, perks, result), true),
    resetRun: () => token && mutate(() => api.resetRun(token, killer), false),
  };
}
