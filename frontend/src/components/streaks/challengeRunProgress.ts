// frontend/src/components/streaks/challengeRunProgress.ts
//
// How each challenge's run maps onto the RunProgress the tracking reads (see challengeTracking.ts).
// Kept apart from the run hooks so the mappings, where the per-challenge meaning of "streak" and
// "checkpoint" lives, can be tested without React.
import type { ChaosRun } from '@/types/chaosStreak';
import type { GauntletRun } from '@/types/gauntletStreak';
import type { HistoryRun } from '@/types/historyStreak';
import type { IdPleaseRun } from '@/types/idPleaseStreak';
import type { PageStreakRun } from '@/types/pageStreak';
import type { RunProgress } from './challengeTracking';

/** The fields of a win streak with checkpoints, which Gauntlet and Chaos share. */
type StreakRun = Pick<GauntletRun, 'attempts' | 'attempt_matches' | 'current_streak' | 'last_checkpoint_streak' | 'status'>;

const streakRunProgress = (r: StreakRun, roster: number): RunProgress => ({
  attempt: r.attempts + 1,
  attemptMatches: r.attempt_matches,
  streak: r.current_streak,
  checkpoint: r.last_checkpoint_streak,
  completed: r.status === 'completed',
  roster,
});

export const gauntletProgress = (r: StreakRun & Pick<GauntletRun, 'owned_characters'>): RunProgress =>
  streakRunProgress(r, r.owned_characters.length);

export const chaosProgress = (r: StreakRun & Pick<ChaosRun, 'owned_killers'>): RunProgress =>
  streakRunProgress(r, r.owned_killers.length);

/** Killers beaten are the streak. Only Medium banks checkpoints (a cleared row), counted in killers like the progress bar does. */
export const historyProgress = (
  r: Pick<HistoryRun, 'attempts' | 'attempt_matches' | 'total_killers_beaten' | 'mode' | 'checkpoint_row_index' | 'row_size' | 'status' | 'total_owned_killers'>
): RunProgress => ({
  attempt: r.attempts + 1,
  attemptMatches: r.attempt_matches,
  streak: r.total_killers_beaten,
  checkpoint: r.mode === 'medium' ? r.checkpoint_row_index * r.row_size : 0,
  completed: r.status === 'completed',
  roster: r.total_owned_killers,
});

/** Pages cleared are the streak. There are no checkpoints, and the run's size is its page count. */
export const pageStreakProgress = (
  r: Pick<PageStreakRun, 'attempts' | 'attempt_matches' | 'current_page' | 'status' | 'page_count'>
): RunProgress => ({
  attempt: r.attempts + 1,
  attemptMatches: r.attempt_matches,
  streak: r.current_page - 1,
  checkpoint: 0,
  completed: r.status === 'completed',
  roster: r.page_count,
});

/** The run never ends, so "completed" is the one-time badge. There is no roster size to report. */
export const idPleaseProgress = (
  r: Pick<IdPleaseRun, 'attempts' | 'attempt_matches' | 'current_streak' | 'last_checkpoint_streak' | 'badge_earned'>
): RunProgress => ({
  attempt: r.attempts + 1,
  attemptMatches: r.attempt_matches,
  streak: r.current_streak,
  checkpoint: r.last_checkpoint_streak,
  completed: r.badge_earned,
});
