// frontend/src/types/chaosStreak.ts
import { Perk } from './gauntletStreak';

export type Difficulty = 'easy' | 'medium' | 'hell';

export type AddonRarity = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Ultra Rare';

export interface ChaosPerk extends Perk {}

export interface ChaosRun {
  id: number;
  user_id: number;
  difficulty: Difficulty;
  status: string;
  current_streak: number;
  best_streak: number;
  last_checkpoint_streak: number;
  completed_killers: string[];
  checkpoint_killers: string[];
  used_perks: string[];
  checkpoint_used_perks: string[];
  owned_killers: string[];
  unlocked_perks: string[];
  unlocked_perks_detail: Perk[];
  current_perks: Perk[];
  current_addon_rarities: AddonRarity[];
  perks_revealed: boolean;
  checkpoint_interval: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChaosMatchLog {
  id: number;
  run_id: number;
  killer_id: string;
  result: 'win' | 'loss';
  perks: Perk[];
  addon_rarities: AddonRarity[];
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface ChaosStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: ChaosMatchLog[];
}

export interface ChaosRunResponse {
  run: ChaosRun;
}

export interface ChaosSubmitResultResponse {
  run: ChaosRun;
}

export interface ChaosStatsResponse {
  stats: ChaosStats;
}
