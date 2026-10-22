// frontend/src/components/streaks/useChallengeRun.ts
'use client';

import { logger } from '@/utils/logger';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  // Decides which answers are still worth showing and blocks a second click while an action is in flight.
  const [tracker] = useState(() => createRunRequestTracker(scope));
  useLayoutEffect(() => {
    configRef.current = config;
    tracker.setScope(config.scope);
  });

  const [run, setRun] = useState<TRun | null>(null);
  const [stats, setStats] = useState<TStats | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  // The run whose load has settled (a manual reload shows as loading too); signed out, it never loads.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const loading = !token || reloading || loadedFor !== scope;
  // Every run with a server action in flight; this run is busy while it is one of them.
  const [actingScopes, setActingScopes] = useState<readonly string[]>([]);
  // An error belongs to the run it happened on.
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const error = failure && failure.scope === scope ? failure.message : null;

  // Promise chains rather than async/await: the state they set is only ever set in their callbacks.
  const loadStats = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    const isLatest = tracker.begin('stats', scope);
    return configRef.current.fetchStats(token).then(
      (loaded) => {
        if (isLatest()) setStats(loaded);
      },
      (err: unknown) => logger.error(`Failed to load ${label} stats:`, err)
    );
  }, [token, scope, label, tracker]);

  const loadCompletions = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    const isLatest = tracker.begin('completions', scope);
    return configRef.current.fetchCompletions(token).then(
      (loaded) => {
        if (isLatest()) setCompletions(loaded);
      },
      (err: unknown) => logger.error(`Failed to load ${label} completion history:`, err)
    );
  }, [token, scope, label, tracker]);

  /** Fetches the run; only the newest request for the run the player is still on is shown. */
  const fetchRun = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    const isLatest = tracker.begin('run', scope);
    return configRef.current
      .fetchRun(token)
      .then(
        (loaded) => {
          if (!isLatest()) return;
          setRun(loaded);
          setFailure(null);
        },
        (err: unknown) => {
          if (isLatest()) setFailure({ scope, message: err instanceof Error ? err.message : 'Could not load this run' });
        }
      )
      .finally(() => {
        if (isLatest()) setLoadedFor(scope);
      });
  }, [token, scope, tracker]);

  const load = useCallback(async () => {
    if (!token) return;
    setReloading(true);
    setFailure(null);
    try {
      await fetchRun();
    } finally {
      setReloading(false);
    }
  }, [token, fetchRun]);

  useEffect(() => {
    void fetchRun();
    void loadStats();
    void loadCompletions();
  }, [fetchRun, loadStats, loadCompletions]);

  /** Runs a server action that returns the updated run; undefined when it failed, when another action on this run
   *  is still running, or when the player moved to another run before it answered. */
  const mutate = useCallback(
    async (action: () => Promise<TRun>, failureMessage = 'That did not go through. Try again.') => {
      const requestScope = tracker.currentScope();
      if (!token || !tracker.startAction(requestScope)) return undefined;
      setActingScopes((current) => [...current, requestScope]);
      setFailure(null);
      try {
        const updated = await action();
        if (!tracker.acceptRunAnswer(requestScope)) return undefined;
        setRun(updated);
        // A load that this answer replaced never gets to settle itself.
        setLoadedFor(requestScope);
        return updated;
      } catch (err) {
        if (tracker.currentScope() === requestScope) setFailure({ scope: requestScope, message: err instanceof Error ? err.message : failureMessage });
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
