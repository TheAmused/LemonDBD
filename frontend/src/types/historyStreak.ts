// frontend/src/types/historyStreak.ts

export type HistoryMode = 'medium' | 'hell';

export interface HistoryRun {
  id: number;
  user_id: number;
  mode: HistoryMode;
  status: string;
  current_row_index: number;
  total_killers_beaten: number;
  best_killers_beaten: number;
  completed_killers: string[];
  unlocked_perk_names: string[];
  checkpoint_row_index: number;
  current_row_killers: string[];
  owned_killers: string[];
  row_size: number;
  total_rows: number;
  total_owned_killers: number;
  newly_unlocked_perks?: string[];
  row_cleared?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryMatchLog {
  id: number;
  run_id: number;
  killer_id: string;
  result: 'win' | 'loss';
  row_index: number;
  streak_before: number;
  streak_after: number;
  timestamp?: string;
}

export interface HistoryStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: HistoryMatchLog[];
}

export interface HistoryRunResponse {
  run: HistoryRun;
}

export interface HistoryStatsResponse {
  stats: HistoryStats;
}
