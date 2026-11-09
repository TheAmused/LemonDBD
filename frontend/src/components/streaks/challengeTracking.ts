// frontend/src/components/streaks/challengeTracking.ts
//
// What every challenge tells Umami (the catalogue is utils/analytics.ts). The five challenges keep their
// runs in different shapes, so each run hook maps its own run to a RunProgress and hands the state before
// and after a match to reportMatchResult; the rules for what counts as a start, a checkpoint, a loss or a
// completion live here once.
import {
  trackEvent,
  type ChallengeBoost,
  type ChallengeId,
  type ChallengeRole,
  type ChallengeTag,
  type ChallengeUiAction,
} from '@/utils/analytics';
import type { RosterEntry } from '@/types/pageStreak';

/** A run as the tracking sees it, whatever the challenge calls its fields. */
export interface RunProgress {
  /** The number of the attempt in play, counting from 1 (the run's failed attempts plus one). */
  attempt: number;
  /** Matches played in the attempt in play; an attempt only counts once it has one. */
  attemptMatches: number;
  /** How far the attempt got: the win streak, killers beaten or pages cleared. */
  streak: number;
  /** The streak of the last checkpoint banked; 0 where the challenge has none. */
  checkpoint: number;
  /** The run is finished (ID, Please: its badge was earned). */
  completed: boolean;
  /** How many characters (pages) the run is made of, when the challenge has such a number. */
  roster?: number;
}

/**
 * Reports what one finished match did to the run. `before` is the run as it was when the match was sent,
 * `after` the run the server answered with. A first match that is lost both starts and ends its attempt,
 * so a start is read from `before` rather than from the change. Every lost match begins the next attempt
 * (also when it falls back to a checkpoint), so count players that began a challenge with `attempt = 1`.
 */
export function reportMatchResult(tag: ChallengeTag, before: RunProgress, after: RunProgress, result: 'win' | 'loss'): void {
  if (before.attemptMatches === 0) {
    trackEvent('challenge_start', {
      ...tag,
      attempt: before.attempt,
      ...(before.roster !== undefined && { roster: before.roster }),
    });
  }
  if (result === 'win') trackEvent('challenge_win', { ...tag, streak: before.streak + 1 });
  // A loss that left the attempt number alone was spared (a Gauntlet shield): the attempt goes on, so nothing failed.
  if (result === 'loss' && after.attempt > before.attempt) trackEvent('challenge_loss', { ...tag, streak: before.streak });
  // The win that completes the run is celebrated as the completion, not as one more checkpoint.
  if (after.completed && !before.completed) trackEvent('challenge_complete', { ...tag, attempts: before.attempt });
  else if (result === 'win' && after.checkpoint > before.checkpoint) {
    trackEvent('challenge_checkpoint', { ...tag, streak: after.checkpoint });
  }
}

/** Reports a confirmed reset. Giving up a finished run or an attempt with no match played gives up nothing. */
export function reportAbandon(tag: ChallengeTag, before: RunProgress): void {
  if (before.completed || before.attemptMatches === 0) return;
  trackEvent('challenge_abandon', { ...tag, streak: before.streak });
}

/**
 * Reports Page Streak's reset of every killer at once, with what it gave up: the roster as the player saw it,
 * where `in_progress` is an attempt with a match played and `completed` a finished run. Nothing to give up is not reported.
 */
export function reportAbandonAllKillers(roster: readonly Pick<RosterEntry, 'status'>[]): void {
  const inProgress = roster.filter((entry) => entry.status === 'in_progress').length;
  const completed = roster.filter((entry) => entry.status === 'completed').length;
  if (inProgress + completed === 0) return;
  trackEvent('challenge_abandon_all', { challenge: 'page_streak', in_progress: inProgress, completed });
}

/** Reports the tokens a win added to the balance; a win that added none (balance already full) is not reported. */
export function reportTokens(tag: ChallengeTag, earned: number): void {
  if (earned > 0) trackEvent('challenge_tokens', { ...tag, earned });
}

export function reportBoost(tag: ChallengeTag, boost: ChallengeBoost, price: number): void {
  trackEvent('challenge_boost', { ...tag, boost, price });
}

export function reportModeChange(challenge: ChallengeId, role: ChallengeRole, from: string, to: string): void {
  if (from !== to) trackEvent('challenge_mode_change', { challenge, role, from, to });
}

const CHALLENGE_BY_PATH_SEGMENT: Readonly<Record<string, ChallengeId>> = {
  'gauntlet-streak': 'gauntlet',
  'chaos-streak': 'chaos',
  'history-streak': 'history',
  'page-streak': 'page_streak',
  'id-please': 'id_please',
};

/** Which challenge a `/<locale>/streaks/<role>/<challenge>` path is, so the shared buttons need no props to say it. */
export function challengeFromPath(pathname: string | null): ChallengeId | null {
  const segments = (pathname ?? '').split('/').filter(Boolean);
  if (segments[1] !== 'streaks') return null;
  return CHALLENGE_BY_PATH_SEGMENT[segments[3] ?? ''] ?? null;
}

/** A click on one of the buttons every challenge shares. Does nothing off a challenge page. */
export function reportChallengeUi(pathname: string | null, action: ChallengeUiAction): void {
  const challenge = challengeFromPath(pathname);
  if (challenge) trackEvent('challenge_ui', { challenge, action });
}
