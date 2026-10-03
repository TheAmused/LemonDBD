// frontend/src/components/streaks/gauntlet/useGauntletRun.ts
'use client';

import { useCallback } from 'react';
import {
  DEFAULT_GAUNTLET_GAME_MODE,
  GauntletGameMode,
  GauntletRun,
  GauntletStats,
  Role,
} from '@/types/gauntletStreak';
import * as api from '@/services/gauntletStreakApi';
import { useBankedCheckpoint, useChallengeRun } from '../useChallengeRun';

export function useGauntletRun(role: Role, gameMode: GauntletGameMode = DEFAULT_GAUNTLET_GAME_MODE) {
  const { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<GauntletRun, GauntletStats>({
      scope: `${role}:${gameMode}`,
      label: 'gauntlet',
      fetchRun: async (t) => (await api.fetchRun(t, role, gameMode)).run,
      fetchStats: async (t) => (await api.fetchStats(t, role, gameMode)).stats,
      fetchCompletions: async (t) => (await api.fetchCompletions(t, role, gameMode)).completions,
    });
  // The checkpoint streak just banked by a win, so the board can show a
  // one-off celebration. Null once dismissed or once nothing new was banked.
  const { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration } = useBankedCheckpoint();

  const submitResult = useCallback(
    async (result: 'win' | 'loss') => {
      if (!token || !run) return;
      const checkpointBefore = run.last_checkpoint_streak;
      let outcome: Awaited<ReturnType<typeof api.submitMatchResult>> | undefined;
      const updated = await mutate(async () => {
        outcome = await api.submitMatchResult(token, role, run.id, result);
        return outcome.run;
      }, 'Failed to record the result');
      if (!updated || !outcome) return;
      loadStats();
      // A win that banks a fresh checkpoint gets its own celebration. If that
      // same win also finished the gauntlet, the win screen covers that instead.
      const justFinished = outcome.previous_run.status === 'completed';
      if (justFinished) loadCompletions();
      if (result === 'win' && !justFinished && outcome.previous_run.last_checkpoint_streak > checkpointBefore) {
        setJustBankedCheckpoint(outcome.previous_run.last_checkpoint_streak);
      }
    },
    [token, role, run, mutate, loadStats, loadCompletions, setJustBankedCheckpoint]
  );

  const reveal = useCallback(() => {
    if (!token || !run) return;
    return mutate(() => api.revealTarget(token, run.id));
  }, [token, run, mutate]);

  const chooseTarget = useCallback(
    (character: string) => {
      if (!token || !run) return;
      return mutate(() => api.selectTarget(token, run.id, character));
    },
    [token, run, mutate]
  );

  const reset = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    return mutate(() => api.resetRun(token, role, gameMode));
  }, [token, role, gameMode, mutate, setJustBankedCheckpoint]);

  return {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    reload: load,
    submitResult,
    reveal,
    chooseTarget,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  };
}
