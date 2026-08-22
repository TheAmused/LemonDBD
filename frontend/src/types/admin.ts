// frontend/src/types/admin.ts
export interface ChallengeCompletionCounts {
  completed_runs: number;
  unique_users: number;
}

export interface ChallengeCompletionBreakdown {
  total: ChallengeCompletionCounts;
  by_variant: Record<string, ChallengeCompletionCounts>;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  total_characters: number;
  survivors_count: number;
  killers_count: number;
  total_perks: number;
  challenge_completions: {
    gauntlet: ChallengeCompletionBreakdown;
    chaos: ChallengeCompletionBreakdown;
    history: ChallengeCompletionBreakdown;
    page_streak: ChallengeCompletionBreakdown;
  };
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
}

export interface AdminBugReport {
  id: number;
  user_id?: number;
  reporter_name: string;
  reporter_email?: string;
  title: string;
  category: string;
  message: string;
  images: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface BugReportStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

export interface ActionMessage {
  type: 'success' | 'error';
  text: string;
}

export interface AdminCharacterRow {
  id: number;
  name: string;
  role: string;
  avatar_local_path?: string | null;
  is_disabled: boolean;
  disabled_reason?: string | null;
}

export interface AdminPerkRow {
  id: number;
  name: string;
  category: string;
  character: string;
  icon_local_path?: string | null;
  is_disabled: boolean;
  disabled_reason?: string | null;
}

export type ChallengeMode = 'gauntlet' | 'chaos' | 'history' | 'page_streak';

export interface ChallengeModeSetting {
  id: number;
  mode: ChallengeMode;
  is_enabled: boolean;
  disabled_reason?: string | null;
  updated_at: string;
}

export interface AdminAuditLogEntry {
  id: number;
  admin_user_id: number | null;
  admin_username: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

