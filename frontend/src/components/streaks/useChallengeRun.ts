// frontend/src/components/streaks/useChallengeRun.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { useAuth } from '@/context/AuthContext';

export interface ChallengeRunConfig<TRun, TStats> {
  /** Changes whenever the run being shown changes (role, mode, killer...), which reloads everything. */
  scope: string;
  /** Name used in console errors, e.g. "chaos". */
  label: string;
  fetchRun: (token: string) => Promise<TRun | null>;
  fetchStats: (token: string) => Promise<TStats>;
  fetchCompletions: (token: string) => Promise<ChallengeCompletion[]>;
}

/**
 * The load/mutate state machine every challenge shares: the current run, its
 * stats and completion history, and loading/busy/error flags. Each challenge's
 * own hook adds its domain actions on top via `mutate`.
 */
export function useChallengeRun<TRun, TStats>(config: ChallengeRunConfig<TRun, TStats>) {
  const { token } = useAuth();
  const { scope, label } = config;
  // The fetchers are closures over the caller's arguments; `scope` is what says they changed.
  const configRef = useRef(config);
  configRef.current = config;

  const [run, setRun] = useState<TRun | null>(null);
  const [stats, setStats] = useState<TStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      setStats(await configRef.current.fetchStats(token));
    } catch (err) {
      console.error(`Failed to load ${label} stats:`, err);
    }
  }, [token, scope, label]);

  const loadCompletions = useCallback(async () => {
    if (!token) return;
    try {
      setCompletions(await configRef.current.fetchCompletions(token));
    } catch (err) {
      console.error(`Failed to load ${label} completion history:`, err);
    }
  }, [token, scope, label]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRun(await configRef.current.fetchRun(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      setLoading(false);
    }
  }, [token, scope]);

  useEffect(() => {
    load();
    loadStats();
    loadCompletions();
  }, [load, loadStats, loadCompletions]);

  /** Runs a server action that returns the updated run; undefined when it failed. */
  const mutate = useCallback(
    async (action: () => Promise<TRun>, failureMessage = 'That did not go through. Try again.') => {
      if (!token) return undefined;
      setBusy(true);
      setError(null);
      try {
        const updated = await action();
        setRun(updated);
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : failureMessage);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  return { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate };
}

/** The one-off checkpoint celebration state shared by Gauntlet and Chaos. */
export function useBankedCheckpoint() {
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);
  const dismissCheckpointCelebration = useCallback(() => setJustBankedCheckpoint(null), []);
  return { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration };
}
