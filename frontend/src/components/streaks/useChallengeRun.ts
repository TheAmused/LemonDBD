// frontend/src/components/streaks/useChallengeRun.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { useAuth } from '@/context/AuthContext';

type RequestChannel = 'run' | 'stats' | 'completions';

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
  // The scope of the server action in flight, set the moment it starts so a second click before the next render
  // cannot start another one. Another run's action is not blocked by it.
  const mutatingScopeRef = useRef<string | null>(null);
  const requestCounts = useRef<Record<RequestChannel, number>>({ run: 0, stats: 0, completions: 0 });

  const [run, setRun] = useState<TRun | null>(null);
  const [stats, setStats] = useState<TStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** Starts a request. Its answer is only worth showing while no newer request on the channel has started
   *  and the player is still on the run it was made for. */
  const startRequest = useCallback((channel: RequestChannel, requestScope: string) => {
    const id = ++requestCounts.current[channel];
    return () => requestCounts.current[channel] === id && configRef.current.scope === requestScope;
  }, []);

  // Moving to another run leaves the old run's action behind: it no longer blocks or marks anything busy here.
  useEffect(() => {
    mutatingScopeRef.current = null;
    setBusy(false);
  }, [scope]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    const isLatest = startRequest('stats', scope);
    try {
      const loaded = await configRef.current.fetchStats(token);
      if (isLatest()) setStats(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} stats:`, err);
    }
  }, [token, scope, label, startRequest]);

  const loadCompletions = useCallback(async () => {
    if (!token) return;
    const isLatest = startRequest('completions', scope);
    try {
      const loaded = await configRef.current.fetchCompletions(token);
      if (isLatest()) setCompletions(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} completion history:`, err);
    }
  }, [token, scope, label, startRequest]);

  const load = useCallback(async () => {
    if (!token) return;
    const isLatest = startRequest('run', scope);
    setLoading(true);
    setError(null);
    try {
      const loaded = await configRef.current.fetchRun(token);
      if (isLatest()) setRun(loaded);
    } catch (err) {
      if (isLatest()) setError(err instanceof Error ? err.message : 'Could not load this run');
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [token, scope, startRequest]);

  useEffect(() => {
    load();
    loadStats();
    loadCompletions();
  }, [load, loadStats, loadCompletions]);

  /** Runs a server action that returns the updated run; undefined when it failed, when another action on this run
   *  is still running, or when the player moved to another run before it answered. */
  const mutate = useCallback(
    async (action: () => Promise<TRun>, failureMessage = 'That did not go through. Try again.') => {
      const requestScope = configRef.current.scope;
      if (!token || mutatingScopeRef.current === requestScope) return undefined;
      mutatingScopeRef.current = requestScope;
      setBusy(true);
      setError(null);
      try {
        const updated = await action();
        // The answer is the newest state of the run, so a load that started before it must not overwrite it.
        if (!startRequest('run', requestScope)()) return undefined;
        setRun(updated);
        setLoading(false);
        return updated;
      } catch (err) {
        if (configRef.current.scope === requestScope) setError(err instanceof Error ? err.message : failureMessage);
        return undefined;
      } finally {
        if (mutatingScopeRef.current === requestScope) {
          mutatingScopeRef.current = null;
          setBusy(false);
        }
      }
    },
    [token, startRequest]
  );

  return { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate };
}

/** The one-off checkpoint celebration state shared by Gauntlet and Chaos. */
export function useBankedCheckpoint() {
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);
  const dismissCheckpointCelebration = useCallback(() => setJustBankedCheckpoint(null), []);
  return { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration };
}
