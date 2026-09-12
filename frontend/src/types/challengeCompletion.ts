// frontend/src/types/challengeCompletion.ts
/** A permanent snapshot of one fully-completed gauntlet/chaos/history run. */
export interface ChallengeCompletion {
  id: number;
  mode: string;
  variant: string;
  attempts_taken: number;
  unlocked_characters_count: number;
  completed_at: string;
}

export interface CompletionsResponse {
  completions: ChallengeCompletion[];
}
