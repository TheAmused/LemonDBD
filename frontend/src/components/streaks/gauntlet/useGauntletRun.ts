// frontend/src/components/streaks/gauntlet/useGauntletRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { GauntletRun, GauntletStats, Role } from '@/types/gauntletStreak';
import * as api from '@/services/gauntletStreakApi';
import { useAuth } from '@/context/AuthContext';

export function useGauntletRun(role: Role) {
  const { token } = useAuth();
  const [run, setRun] = useState<GauntletRun | null>(null);
  const [stats, setStats] = useState<GauntletStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // The checkpoint streak just banked by a win, so the board can show a
  // one-off celebration. Null once dismissed or once nothing new was banked.
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await api.fetchStats(token, role);
      setStats(resp.stats);
    } catch (err) {
      console.error('Failed to load gauntlet stats:', err);
    }
  }, [token, role]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.fetchRun(token, role);
      setRun(resp.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this gauntlet');
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const mutate = useCallback(
    async (action: () => Promise<GauntletRun>) => {
      if (!token) return;
      setBusy(true);
      setError(null);
      try {
        setRun(await action());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  const submitResult = useCallback(
    async (result: 'win' | 'loss') => {
      if (!token || !run) return;
      const checkpointBefore = run.last_checkpoint_streak;
      setBusy(true);
      setError(null);
      try {
        const resp = await api.submitMatchResult(token, role, run.id, result);
        setRun(resp.run);
        loadStats();
        // A win that banks a fresh checkpoint gets its own celebration. If that
        // same win also finished the gauntlet, the win screen covers that instead.
        const justFinished = resp.previous_run.status === 'completed';
        if (
          result === 'win' &&
          !justFinished &&
          resp.previous_run.last_checkpoint_streak > checkpointBefore
        ) {
          setJustBankedCheckpoint(resp.previous_run.last_checkpoint_streak);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record the result');
      } finally {
        setBusy(false);
      }
    },
    [token, role, run, loadStats]
  );

  const dismissCheckpointCelebration = useCallback(() => {
    setJustBankedCheckpoint(null);
  }, []);

  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealTarget(token, run.id));
  }, [token, run, mutate]);

  const reset = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    return mutate(() => api.resetRun(token, role));
  }, [token, role, mutate]);

  return {
    run,
    stats,
    loading,
    busy,
    error,
    reload: load,
    submitResult,
    reveal,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  };
}
