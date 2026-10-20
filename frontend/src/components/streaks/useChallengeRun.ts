// frontend/src/components/streaks/useChallengeRun.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeCompletion } from '@/types/challengeCompletion';
import { useAuth } from '@/context/AuthContext';
import { createRunRequestTracker } from './runRequestTracker';

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
  // Decides which answers are still worth showing and blocks a second click while an action is in flight.
  const [tracker] = useState(() => createRunRequestTracker(() => configRef.current.scope));

  const [run, setRun] = useState<TRun | null>(null);
  const [stats, setStats] = useState<TStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Every run with a server action in flight; this run is busy while it is one of them.
  const [actingScopes, setActingScopes] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
    const isLatest = tracker.begin('stats', scope);
    try {
      const loaded = await configRef.current.fetchStats(token);
      if (isLatest()) setStats(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} stats:`, err);
    }
  }, [token, scope, label, tracker]);

  const loadCompletions = useCallback(async () => {
    if (!token) return;
    const isLatest = tracker.begin('completions', scope);
    try {
      const loaded = await configRef.current.fetchCompletions(token);
      if (isLatest()) setCompletions(loaded);
    } catch (err) {
      console.error(`Failed to load ${label} completion history:`, err);
    }
  }, [token, scope, label, tracker]);

  const load = useCallback(async () => {
    if (!token) return;
    const isLatest = tracker.begin('run', scope);
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
  }, [token, scope, tracker]);

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
      if (!token || !tracker.startAction(requestScope)) return undefined;
      setActingScopes((current) => [...current, requestScope]);
      setError(null);
      try {
        const updated = await action();
        if (!tracker.acceptRunAnswer(requestScope)) return undefined;
        setRun(updated);
        // A load that this answer replaced never gets to clear the flag itself.
        setLoading(false);
        return updated;
      } catch (err) {
        if (configRef.current.scope === requestScope) setError(err instanceof Error ? err.message : failureMessage);
        return undefined;
      } finally {
        tracker.finishAction(requestScope);
        setActingScopes((current) => current.filter((acting) => acting !== requestScope));
      }
    },
    [token, tracker]
  );

  const busy = actingScopes.includes(scope);

  return { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate };
}

/** The one-off checkpoint celebration state shared by Gauntlet and Chaos. */
export function useBankedCheckpoint() {
  const [justBankedCheckpoint, setJustBankedCheckpoint] = useState<number | null>(null);
  const dismissCheckpointCelebration = useCallback(() => setJustBankedCheckpoint(null), []);
  return { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration };
}
