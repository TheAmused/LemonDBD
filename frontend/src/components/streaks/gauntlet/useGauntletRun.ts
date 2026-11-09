// frontend/src/components/streaks/gauntlet/useGauntletRun.ts
'use client';

import { useCallback, useState } from 'react';
import type {
  BuyableBoost,
  GauntletGameMode,
  GauntletRun,
  GauntletStats,
  Role} from '@/types/gauntletStreak';
import {
  DEFAULT_GAUNTLET_GAME_MODE
} from '@/types/gauntletStreak';
import * as api from '@/services/gauntletStreakApi';
import { useBankedCheckpoint, useChallengeRun } from '../useChallengeRun';
import { reportAbandon, reportBoost, reportMatchResult, reportTokens } from '../challengeTracking';
import { gauntletProgress } from '../challengeRunProgress';
import type { ChallengeTag } from '@/utils/analytics';

const tagOf = (role: Role, gameMode: GauntletGameMode): ChallengeTag => ({ challenge: 'gauntlet', role, variant: gameMode });

/** A win's token roll waiting to be shown: what was rolled and the balance before it landed. A roll of 0 means the balance was already full, so nothing was rolled. */
export interface TokenRollPlay {
  roll: number;
  from: number;
}

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
  const [tokenRoll, setTokenRoll] = useState<TokenRollPlay | null>(null);

  const submitResult = useCallback(
    async (result: 'win' | 'loss', useShield = false) => {
      if (!token || !run) return;
      const checkpointBefore = run.last_checkpoint_streak;
      const tokensBefore = run.tokens;
      let outcome: Awaited<ReturnType<typeof api.submitMatchResult>> | undefined;
      const updated = await mutate(async () => {
        outcome = await api.submitMatchResult(token, role, run.id, result, useShield);
        return outcome.run;
      }, 'Failed to record the result');
      if (!updated || !outcome) return;
      // `run` is the next match already; the match that was just played is `previous_run`.
      const tag = tagOf(role, gameMode);
      reportMatchResult(tag, gauntletProgress(run), gauntletProgress(outcome.previous_run), result);
      if (result === 'win') reportTokens(tag, outcome.previous_run.tokens - tokensBefore);
      // The shield is charged only when it kept the attempt alive (at a checkpoint there is nothing to protect and it is free).
      else if (useShield && run.boosts && outcome.previous_run.attempts === run.attempts) reportBoost(tag, 'shield', run.boosts.prices.shield);
      void loadStats();
      const tokensFull = run.boosts != null && tokensBefore >= run.boosts.cap;
      if (result === 'win' && (outcome.previous_run.last_token_roll > 0 || tokensFull)) {
        setTokenRoll({ roll: outcome.previous_run.last_token_roll, from: tokensBefore });
      }
      // A win that banks a fresh checkpoint gets its own celebration. If that
      // same win also finished the gauntlet, the win screen covers that instead.
      const justFinished = outcome.previous_run.status === 'completed';
      if (justFinished) void loadCompletions();
      if (result === 'win' && !justFinished && outcome.previous_run.last_checkpoint_streak > checkpointBefore) {
        setJustBankedCheckpoint(outcome.previous_run.last_checkpoint_streak);
      }
    },
    [token, role, gameMode, run, mutate, loadStats, loadCompletions, setJustBankedCheckpoint]
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

  const buyBoost = useCallback(
    async (boost: BuyableBoost, character?: string) => {
      if (!token || !run) return undefined;
      const updated = await mutate(() => api.buyBoost(token, run.id, boost, character), 'Could not buy that boost');
      if (updated && run.boosts) reportBoost(tagOf(role, gameMode), boost, run.boosts.prices[boost]);
      return updated;
    },
    [token, role, gameMode, run, mutate]
  );

  const abandon = useCallback(async () => {
    if (!token) return undefined;
    setJustBankedCheckpoint(null);
    setTokenRoll(null);
    const updated = await mutate(() => api.abandonRun(token, role, gameMode));
    if (updated && run) reportAbandon(tagOf(role, gameMode), gauntletProgress(run));
    return updated;
  }, [token, role, gameMode, run, mutate, setJustBankedCheckpoint]);

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
    buyBoost,
    abandon,
    tokenRoll,
    dismissTokenRoll: () => setTokenRoll(null),
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  };
}
