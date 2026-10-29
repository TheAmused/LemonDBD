// frontend/src/types/idPleaseStreak.ts

export const ID_PLEASE_DIFFICULTIES = ['milestones', 'hardcore', 'hardcore_plus'] as const;
export type IdPleaseDifficulty = (typeof ID_PLEASE_DIFFICULTIES)[number];

/** The win streak that earns each difficulty's one-time badge. Mirrors backend/app/services/id_please/constants.py.
 *  The exception is Milestones in a single-side lane: its badge is winning with every character of the side. */
export const ID_PLEASE_BADGE_STREAK: Record<IdPleaseDifficulty, number> = { milestones: 50, hardcore: 30, hardcore_plus: 25 };

export type IdPleaseSide = 'killer' | 'survivor';

/** One way to play: `mixed` alternates the side every match, the others stay on one side. Each lane has its own
 *  runs, statistics, badges and admin kill switch (its backend mode). */
export const ID_PLEASE_LANES = ['mixed', 'survivor', 'killer'] as const;
export type IdPleaseLane = (typeof ID_PLEASE_LANES)[number];

/** The backend `ChallengeModeSetting.mode` (and completion mode) of each lane. */
export const ID_PLEASE_MODE_BY_LANE: Record<IdPleaseLane, string> = {
  mixed: 'id_please',
  survivor: 'id_please_survivor',
  killer: 'id_please_killer',
};

/** The streaks tab a lane lives in: the combined tab is `challenge`. */
export function idPleaseLaneForRole(role: string): IdPleaseLane {
  return role === 'killer' || role === 'survivor' ? role : 'mixed';
}

/** The side a single-side lane is played on; null for the mixed lane, where the player picks the starting side. */
export function idPleaseLaneSide(lane: IdPleaseLane): IdPleaseSide | null {
  return lane === 'mixed' ? null : lane;
}

export function parseIdPleaseDifficulty(value: string | null | undefined): IdPleaseDifficulty {
  return ID_PLEASE_DIFFICULTIES.find((d) => d === value) ?? 'milestones';
}

/** A character as the player sees it; `position` is its ID in their current list (counted from 0). */
export interface IdPleaseCharacter {
  id: number;
  name: string;
  slug?: string;
  avatar_url?: string;
  avatar_local_path?: string;
  /** Null when the character has left the player's list since the match was dealt. */
  position?: number | null;
}

export interface IdPleasePerk {
  id: number;
  name: string;
  icon_url?: string;
  icon_local_path?: string;
  position?: number | null;
}

/** The match in play (or a preview of one). */
export interface IdPleaseMatch {
  number: number;
  side: IdPleaseSide;
  character: IdPleaseCharacter;
  perks: IdPleasePerk[];
}

export interface IdPleaseNeed {
  have: number;
  need: number;
}

export interface IdPleaseSideRequirement {
  characters: IdPleaseNeed;
  perks: IdPleaseNeed;
}

export interface IdPleaseDifficultyEligibility {
  met: boolean;
  killer: IdPleaseSideRequirement;
  survivor: IdPleaseSideRequirement;
}

export interface IdPleaseEligibility {
  difficulties: Record<IdPleaseDifficulty, IdPleaseDifficultyEligibility>;
  roster_fingerprint: string;
}

/** The way to the badge as the progress bar counts it: a streak (mixed lane) or characters won with out of the
 *  characters owned (single-side lanes; the owned count is live). */
export interface IdPleaseBadgeProgress {
  current: number;
  target: number;
}

export interface IdPleaseRun {
  id: number;
  user_id: number;
  lane: IdPleaseLane;
  difficulty: IdPleaseDifficulty;
  status: string;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  opening_side: IdPleaseSide | '';
  /** Hardcore+: the perk ids (sorted) of the last openings of this lane's run; none of them can be chosen again. Empty elsewhere. */
  /** 0 while the run is in setup, otherwise the number of the match in play. */
  current_match: number;
  match: IdPleaseMatch | null;
  /** Milestones: the match a loss returns to. */
  checkpoint: IdPleaseMatch | null;
  checkpoint_interval: number;
  /** The win streak that earns the badge; null in single-side Milestones, whose badge is a win with every character. */
  badge_streak: number | null;
  badge_earned: boolean;
  /** Null once the badge is earned: the progress bar is gone for good. */
  badge_progress: IdPleaseBadgeProgress | null;
  eligibility: IdPleaseDifficultyEligibility;
  roster_fingerprint: string;
  attempts: number;
  attempt: number;
  total_wins: number;
  total_losses: number;
  created_at?: string;
  updated_at?: string;
}

export interface IdPleaseMatchLog {
  id: number;
  run_id: number;
  match_number: number;
  side: IdPleaseSide;
  character_id: number;
  character_name: string;
  perk_ids: number[];
  result: 'win' | 'loss';
  attempt: number;
  streak_before: number;
  streak_after: number;
  timestamp?: string;
  triggered_by: 'player' | 'inactivity';
}

export interface IdPleaseStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: IdPleaseMatchLog[];
}

export interface IdPleaseRoster {
  side: IdPleaseSide;
  characters: IdPleaseCharacter[];
  perks: IdPleasePerk[];
  roster_fingerprint: string;
}

export interface IdPleasePreview {
  first: IdPleaseMatch;
  /** Only the mixed lane previews its second match; a single-side lane keeps it hidden. */
  second: IdPleaseMatch | null;
  roster_fingerprint: string;
}

export interface IdPleaseRunResponse {
  run: IdPleaseRun;
}

export interface IdPleaseStatsResponse {
  stats: IdPleaseStats;
}
