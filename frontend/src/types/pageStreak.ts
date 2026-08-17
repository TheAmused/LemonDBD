export type RunStatus = 'not_started' | 'in_progress' | 'completed';

export interface RosterEntry {
  killer: string;
  status: RunStatus;
  attempt: number;
  current_page: number;
  best_page: number;
  page_count: number;
}

export interface HistoryEntry {
  attempt: number;
  page_number: number;
  perks: string[];
  result: 'win' | 'loss';
  timestamp: string;
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
}

export interface PoolSummary {
  pool_size: number;
  page_count: number;
  perks_per_page: number;
}
