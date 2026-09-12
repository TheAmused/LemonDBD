// frontend/src/types/challengeCompletionStatus.ts
/** Mode -> list of variants, e.g. { chaos: ["easy", "hell"], gauntlet: ["killer_original"] }. */
export type ChallengeVariantMap = Record<string, string[]>;

/** Every mode+variant the current user has ever fully completed, plus which
 *  ones currently have an in-progress run. `completions` drives "already
 *  won" trophy badges; `active_runs` lets the frontend tell a genuinely
 *  finished tier apart from one being replayed after a reset. */
export interface ChallengeCompletionStatus {
  completions: ChallengeVariantMap;
  active_runs: ChallengeVariantMap;
}
