// frontend/src/types/gauntletStreak.ts
export type Role = 'survivor' | 'killer';

export interface Perk {
  id?: number;
  name: string;
  character?: string | null;
  category?: string;
  icon_url?: string;
  icon_local_path?: string;
}

export interface GauntletLoadout {
  character: string;
  /** The target's own teachable perks, shown as the suggested first-slot picks. */
  character_perks: Perk[];
}

export interface TierInfo {
  name: string;
  tier_level: number;
  perk_limit: number;
  /** Killers run their own teachables only; survivors may fill the other slots freely. */
  character_perks_only: boolean;
  description: string;
}

export interface GauntletRun {
  id: number;
  role: Role;
  status: string;
  game_mode: string;
  target_revealed: boolean;
  current_character_id: string;
  current_loadout: GauntletLoadout;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  completed_characters: string[];
  checkpoint_characters: string[];
  tier_info: TierInfo;
  created_at?: string;
  updated_at?: string;
}

export interface MatchLog {
  id: number;
  run_id: number;
  role: Role;
  character_id: string;
  result: 'win' | 'loss';
  perks: Perk[];
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface GauntletStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: MatchLog[];
}

export interface RunResponse {
  run: GauntletRun;
}

export interface SubmitResultResponse {
  run: GauntletRun;
  previous_run: GauntletRun;
}

export interface StatsResponse {
  stats: GauntletStats;
}
