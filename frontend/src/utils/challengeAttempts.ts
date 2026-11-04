// frontend/src/utils/challengeAttempts.ts

/** What every challenge run reports about its attempts. */
export interface AttemptCounters {
  /** Failed or abandoned attempts so far. */
  attempts: number;
  /** Matches played in the current attempt. */
  attempt_matches: number;
  /** Set by modes where an attempt also begins before its first match (Gauntlet's Start). */
  attempt_started?: boolean;
}

/**
 * How many attempts the player has actually started. The one in progress only counts once a match was played in it
 * (or the mode says it began): opening a challenge or pressing reset on an untouched attempt starts nothing.
 */
export const attemptsStarted = (run: AttemptCounters): number =>
  run.attempts + ((run.attempt_started ?? run.attempt_matches > 0) ? 1 : 0);
