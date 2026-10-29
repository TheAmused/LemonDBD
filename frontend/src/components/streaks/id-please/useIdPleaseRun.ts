'use client';
// frontend/src/components/streaks/id-please/useIdPleaseRun.ts

import { useCallback, useState } from 'react';
import type { IdPleaseDifficulty, IdPleaseLane, IdPleaseRun, IdPleaseSide, IdPleaseStats } from '@/types/idPleaseStreak';
import * as api from '@/services/idPleaseStreakApi';
import { StreakApiError } from '@/services/streakApiClient';
import { useBankedCheckpoint, useChallengeRun } from '../useChallengeRun';

/** Conflicts the board explains to the player instead of showing as a failure. */
export type IdPleaseNotice = 'roster_changed' | 'roster_below_minimum' | 'stale_match';

export function useIdPleaseRun(lane: IdPleaseLane, difficulty: IdPleaseDifficulty) {
  const { token, run, stats, completions, loading, busy, error, load, loadStats, loadCompletions, mutate } =
    useChallengeRun<IdPleaseRun, IdPleaseStats>({
      scope: `${lane}-${difficulty}`,
      label: 'id-please',
      fetchRun: (t) => api.fetchIdPleaseRun(lane, t, difficulty),
      fetchStats: (t) => api.fetchIdPleaseStats(lane, t, difficulty),
      fetchCompletions: async (t) => (await api.fetchIdPleaseCompletions(lane, t, difficulty)).completions,
    });
  const { justBankedCheckpoint, setJustBankedCheckpoint, dismissCheckpointCelebration } = useBankedCheckpoint();
  const [notice, setNotice] = useState<IdPleaseNotice | null>(null);
  const [justEarnedBadge, setJustEarnedBadge] = useState(false);

  /** A 409 is the server saying the screen is out of date: take its answer (or reload) and say so. */
  const recovering = useCallback(
    (action: (t: string) => Promise<IdPleaseRun>) => async (): Promise<IdPleaseRun> => {
      if (!token) throw new Error('Not signed in');
      try {
        return await action(token);
      } catch (err) {
        if (!(err instanceof StreakApiError) || err.status !== 409) throw err;
        if (err.code === 'stale_match' && err.body.run) {
          setNotice('stale_match');
          return err.body.run as IdPleaseRun;
        }
        if (err.code === 'roster_changed' || err.code === 'roster_below_minimum') {
          setNotice(err.code);
          return api.fetchIdPleaseRun(lane, token, difficulty);
        }
        throw err;
      }
    },
    [token, lane, difficulty]
  );

  const submitOpening = useCallback(
    async (side: IdPleaseSide, perkPositions: number[]) => {
      if (!run) return undefined;
      setNotice(null);
      return mutate(
        recovering((t) => api.submitIdPleaseOpening(lane, t, run.id, side, perkPositions, run.roster_fingerprint)),
        'Failed to start the run'
      );
    },
    [run, lane, mutate, recovering]
  );

  const submitResult = useCallback(
    async (result: 'win' | 'loss') => {
      if (!run || !run.match) return undefined;
      const before = run;
      setNotice(null);
      const updated = await mutate(
        recovering((t) => api.submitIdPleaseResult(lane, t, before.id, before.current_match, result, before.roster_fingerprint)),
        'Failed to record the result'
      );
      if (!updated) return undefined;
      void loadStats();
      if (result === 'win' && updated.current_streak > before.current_streak) {
        if (updated.badge_earned && !before.badge_earned) {
          setJustEarnedBadge(true);
          void loadCompletions();
        } else if (updated.last_checkpoint_streak > before.last_checkpoint_streak) {
          setJustBankedCheckpoint(updated.last_checkpoint_streak);
        }
      }
      return updated;
    },
    [run, lane, mutate, recovering, loadStats, loadCompletions, setJustBankedCheckpoint]
  );

  const abandon = useCallback(() => {
    if (!token) return;
    setJustBankedCheckpoint(null);
    setNotice(null);
    return mutate(() => api.abandonIdPleaseRun(lane, token, difficulty));
  }, [token, lane, difficulty, mutate, setJustBankedCheckpoint]);

  return {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    notice,
    reload: load,
    submitOpening,
    submitResult,
    abandon,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
    justEarnedBadge,
    dismissBadge: () => setJustEarnedBadge(false),
  };
}
