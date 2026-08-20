// frontend/src/components/streaks/history/useHistoryRun.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { HistoryMode, HistoryRun, HistoryStats } from '@/types/historyStreak';
import * as api from '@/services/historyStreakApi';
import { useAuth } from '@/context/AuthContext';

export function useHistoryRun(mode: HistoryMode) {
  const { token } = useAuth();
  const [run, setRun] = useState<HistoryRun | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.fetchHistoryStats(token, mode);
      setStats(s);
    } catch (err) {
      console.error('Failed to load history stats:', err);
    }
  }, [token, mode]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.fetchHistoryRun(token, mode);
      setRun(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      setLoading(false);
    }
  }, [token, mode]);

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  const submitResult = useCallback(
    async (result: 'win' | 'loss', killerId: string) => {
      if (!token || !run) return undefined;
      setBusy(true);
      setError(null);
      try {
        const updated = await api.submitHistoryResult(token, run.id, result, killerId);
        setRun(updated);
        loadStats();
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record the result');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [token, run, loadStats]
  );

  const reset = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      setRun(await api.resetHistoryRun(token, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  }, [token, mode]);

  return { run, stats, loading, busy, error, submitResult, reset, reload: load };
}
