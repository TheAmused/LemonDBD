// frontend/src/components/streaks/chaos/useChaosRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChaosRun, ChaosStats, Difficulty } from '@/types/chaosStreak';
import * as api from '@/services/chaosStreakApi';
import { useAuth } from '@/context/AuthContext';

export function useChaosRun(difficulty: Difficulty) {
  const { token } = useAuth();
  const [run, setRun] = useState<ChaosRun | null>(null);
  const [stats, setStats] = useState<ChaosStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.fetchChaosStats(token, difficulty);
      setStats(s);
    } catch (err) {
      console.error('Failed to load chaos stats:', err);
    }
  }, [token, difficulty]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.fetchChaosRun(token, difficulty);
      setRun(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      setLoading(false);
    }
  }, [token, difficulty]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const mutate = useCallback(
    async (action: () => Promise<ChaosRun>) => {
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
    async (result: 'win' | 'loss', killerId: string) => {
      if (!token || !run) return;
      const checkpointBefore = run.last_checkpoint_streak;
      setBusy(true);
      setError(null);
      try {
        const updated = await api.submitChaosResult(token, run.id, result, killerId);
        const justFinished = updated.status === 'completed';
        setRun(updated);
        loadStats();
        if (
          result === 'win' &&
          !justFinished &&
          updated.last_checkpoint_streak > checkpointBefore
        ) {
          setJustBankedCheckpoint(updated.last_checkpoint_streak);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record the result');
      } finally {
        setBusy(false);
      }
    },
    [token, run, loadStats]
  );

  const dismissCheckpointCelebration = useCallback(() => {
    setJustBankedCheckpoint(null);
  }, []);

  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealChaosBuild(token, run.id));
  }, [token, run, mutate]);

  const reset = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    return mutate(() => api.resetChaosRun(token, difficulty));
  }, [token, difficulty, mutate]);

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
