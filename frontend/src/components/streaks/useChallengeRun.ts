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
  // Set the moment a server action starts, so a second click before the next render cannot start another one.
  const mutatingRef = useRef(false);
  // An answer that arrives after the player moved to another run is not theirs to show.
  const isCurrent = useCallback((requestScope: string) => configRef.current.scope === requestScope, []);

  const [run, setRun] = useState<TRun | null>(null);
  const [stats, setStats] = useState<TStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const loaded = await configRef.current.fetchStats(token);
      if (isCurrent(scope)) setStats(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} stats:`, err);
    }
  }, [token, scope, label, isCurrent]);

  const loadCompletions = useCallback(async () => {
    if (!token) return;
    try {
      const loaded = await configRef.current.fetchCompletions(token);
      if (isCurrent(scope)) setCompletions(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} completion history:`, err);
    }
  }, [token, scope, label, isCurrent]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const loaded = await configRef.current.fetchRun(token);
      if (isCurrent(scope)) setRun(loaded);
    } catch (err) {
      if (isCurrent(scope)) setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      if (isCurrent(scope)) setLoading(false);
    }
  }, [token, scope, isCurrent]);

  useEffect(() => {
    load();
    loadStats();
    loadCompletions();
  }, [load, loadStats, loadCompletions]);

  /** Runs a server action that returns the updated run; undefined when it failed or another action is still running. */
  const mutate = useCallback(
    async (action: () => Promise<TRun>, failureMessage = 'That did not go through. Try again.') => {
      if (!token || mutatingRef.current) return undefined;
      mutatingRef.current = true;
      const requestScope = configRef.current.scope;
      setBusy(true);
      setError(null);
      try {
        const updated = await action();
        if (isCurrent(requestScope)) setRun(updated);
        return updated;
      } catch (err) {
        if (isCurrent(requestScope)) setError(err instanceof Error ? err.message : failureMessage);
        return undefined;
      } finally {
        mutatingRef.current = false;
        setBusy(false);
      }
    },
    [token, isCurrent]
  );

  return { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate };
}

/** The one-off checkpoint celebration state shared by Gauntlet and Chaos. */
export function useBankedCheckpoint() {
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);
  const dismissCheckpointCelebration = useCallback(() => setJustBankedCheckpoint(null), []);
  return { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration };
}
