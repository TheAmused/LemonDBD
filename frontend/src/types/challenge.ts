export type Role = 'survivor' | 'killer';

export interface MapOffering {
  name: string;
  realm: string;
}

export interface Perk {
  id?: number;
  name: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
}

export interface ChallengeLoadout {
  character: string;
  perks: Perk[];
  map_offering: MapOffering;
}

export interface TierInfo {
  name: string;
  tier_level: number;
  perk_limit: number;
  description: string;
}

export interface ChallengeRun {
  id: number;
  role: Role;
  status: string;
  current_character_id: string;
  current_loadout_json?: string;
  current_loadout: ChallengeLoadout;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  completed_characters_json?: string;
  checkpoint_characters_json?: string;
  completed_characters: string[];
  checkpoint_characters: string[];
  tier_info?: TierInfo;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id?: number;
  active_role: Role;
  checkpoint_interval: number;
}

export interface MatchLog {
  id: number;
  run_id: number;
  role: Role;
  character_id: string;
  result: 'win' | 'loss';
  perks_json: string;
  map_offering: string;
  streak_before: number;
  streak_after: number;
  created_at?: string;
}

export interface ChallengeStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: MatchLog[];
}

export interface RunResponse {
  run: ChallengeRun;
  settings: UserSettings;
  tier_info?: TierInfo;
}

export interface SubmitResultResponse {
  run: ChallengeRun;
  previous_run?: ChallengeRun;
  settings: UserSettings;
}

export interface SettingsResponse {
  settings: UserSettings;
}

export interface StatsResponse {
  stats: ChallengeStats;
}
