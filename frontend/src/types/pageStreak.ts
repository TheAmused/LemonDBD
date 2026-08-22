// frontend/src/types/pageStreak.ts
export type RunStatus = 'not_started' | 'in_progress' | 'completed';

export interface RosterEntry {
  killer: string;
  status: RunStatus;
  attempt: number;
  current_page: number;
  best_page: number;
  page_count: number;
  avatar_local_path?: string | null;
}

export interface HistoryEntry {
  attempt: number;
  page_number: number;
  perks: string[];
  result: 'win' | 'loss';
  timestamp: string;
  triggered_by: 'player' | 'inactivity';
}

export interface PageStreakRun {
  id: number;
  killer: string;
  status: 'in_progress' | 'completed';
  attempt: number;
  current_page: number;
  best_page: number;
  pages: string[][];
  page_count: number;
  snapshot_at: string;
  history: HistoryEntry[];
  perk_icons: Record<string, string>;
  killer_avatar?: string | null;
}

export interface PoolSummary {
  pool_size: number;
  page_count: number;
  perks_per_page: number;
}

export interface PageStreakMatchLog {
  id: number;
  run_id: number;
  killer: string;
  attempt: number;
  page_number: number;
  perks: string[];
  result: 'win' | 'loss';
  timestamp: string;
  triggered_by: 'player' | 'inactivity';
}

export interface PageStreakStats {
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  recent_logs: PageStreakMatchLog[];
}
