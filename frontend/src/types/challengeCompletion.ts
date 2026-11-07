// frontend/src/types/challengeCompletion.ts
/** A permanent snapshot of one fully-completed gauntlet/chaos/history run. */
export interface ChallengeCompletion {
  id: number;
  mode: string;
  variant: string;
  attempts_taken: number;
  matches_played: number;
  unlocked_characters_count: number;
  /** Page Streak only: the pages of perks the run was cleared on. Null elsewhere, and on clears from before it was kept. */
  pages_count: number | null;
  completed_at: string;
}

export interface CompletionsResponse {
  completions: ChallengeCompletion[];
}
