// frontend/src/types/gauntletStreak.ts
export type Role = 'survivor' | 'killer';

/** Mirrors the backend's GAME_MODES; each one keeps its own run per role. */
export const GAUNTLET_GAME_MODES = ['original', 'lemon_solo', 'lemon_duo', 'lemon_squad'] as const;
export type GauntletGameMode = (typeof GAUNTLET_GAME_MODES)[number];

/** Modes where the player picks the character instead of the server rolling one. */
export const PICK_CHARACTER_MODES: readonly GauntletGameMode[] = ['lemon_solo'];
export const DEFAULT_GAUNTLET_GAME_MODE: GauntletGameMode = 'original';

export function parseGauntletGameMode(value: string | null | undefined): GauntletGameMode {
  return GAUNTLET_GAME_MODES.find((mode) => mode === value) ?? DEFAULT_GAUNTLET_GAME_MODE;
}

export interface Perk {
  id?: number;
  name: string;
  character?: string | null;
  category?: string;
  icon_url?: string;
  icon_local_path?: string;
}

export interface GauntletPlayerLoadout {
  character: string;
  character_perks: Perk[];
  random_perks?: Perk[];
}

export interface GauntletLoadout {
  character: string;
  /** The target's own teachable perks, shown as the suggested first-slot picks. */
  character_perks: Perk[];
  /** Dealt instead of an empty loadout on a tier that otherwise allows no perks. */
  random_perks?: Perk[];
  /** One entry per character when a match deals several (duo); the fields above mirror the first. */
  players?: GauntletPlayerLoadout[];
  /** Set in squad matches: how many people share each entry in `players`. */
  players_per_character?: number;
}

export interface TierInfo {
  name: string;
  tier_level: number;
  perk_limit: number;
  /** Killers run their own teachables only; survivors may fill the other slots freely. */
  character_perks_only: boolean;
  description: string;
  /** The original challenge's roster cutoff for this role (43 killers, 52 survivors). */
  roster_limit: number;
  /** How many of the target's own perks are dealt at random; 0 outside the solo last tier. */
  random_perk_count: number;
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
  owned_characters: string[];
  pool_frozen: boolean;
  attempts: number;
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
  triggered_by: 'player' | 'inactivity';
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
