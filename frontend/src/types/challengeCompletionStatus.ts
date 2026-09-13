// frontend/src/types/challengeCompletionStatus.ts
/** Mode -> list of variants, e.g. { chaos: ["easy", "hell"], gauntlet: ["killer_original"] }. */
export type ChallengeVariantMap = Record<string, string[]>;

/** Mode -> variant -> killer count frozen at that full-roster completion. */
export type ChallengeVariantCountMap = Record<string, Record<string, number>>;

/** Every mode+variant the current user has ever fully completed, plus which
 *  ones currently have an in-progress run. `completions` drives "already
 *  won" trophy badges; `active_runs` lets the frontend tell a genuinely
 *  finished tier apart from one being replayed after a reset;
 *  `completion_counts` is the killer count frozen at a variant's most
 *  recent completion (gold badge, any roster size); `full_roster` upgrades
 *  a card's badge to the red "beaten with the entire game roster" variant,
 *  with the killer count frozen at that specific completion. */
export interface ChallengeCompletionStatus {
  completions: ChallengeVariantMap;
  active_runs: ChallengeVariantMap;
  completion_counts: ChallengeVariantCountMap;
  full_roster: ChallengeVariantCountMap;
}
