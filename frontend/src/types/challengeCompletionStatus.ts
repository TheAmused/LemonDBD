// frontend/src/types/challengeCompletionStatus.ts
/** Every mode+variant the current user has ever fully completed, e.g.
 *  { chaos: ["easy", "hell"], gauntlet: ["killer_original"] }. Drives
 *  "already won" trophy badges on challenge cards and difficulty tiles. */
export type ChallengeCompletionStatus = Record<string, string[]>;
