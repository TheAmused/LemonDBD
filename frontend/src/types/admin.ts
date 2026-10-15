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
  login: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  /** End of the longest running suspension; a past value is stale (see accountStanding). */
  suspended_until?: string | null;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
  two_factor_enabled?: boolean;
}

export interface AdminBugReport {
  id: number;
  user_id?: number;
  reporter_name: string;
  reporter_email?: string;
  title: string;
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
  avatar_portrait_path?: string | null;
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


export interface AdminSiteSetting {
  key: string;
  kind: 'int' | 'email';
  group: 'privacy' | 'tokens' | 'retention' | 'moderation';
  value: string | number;
  default: string | number;
  overridden: boolean;
  min: number | null;
  max: number | null;
}

export type ContentReportStatus = 'pending' | 'resolved_banned' | 'dismissed' | 'expired';
export type ContentReportAction = 'ban' | 'dismiss';

/** One deduplicated report on a piece of user-made content (one row per content hash). */
export interface AdminContentReport {
  id: number;
  content_type: string;
  content_hash: string;
  author_id: number | null;
  author_login: string;
  report_count: number;
  primary_reason: string;
  status: ContentReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  expires_at: string;
  created_at: string;
  has_evidence: boolean;
}

export interface AdminContentReportList {
  items: AdminContentReport[];
  total: number;
  pending_total: number;
  page: number;
  per_page: number;
}

export interface AdminContentReportDetail extends AdminContentReport {
  /** The reported document as canonical JSON. Null once resolved or expired (zero retention). */
  evidence_payload: string | null;
  reports: { reason: string; notes: string | null; created_at: string | null }[];
  reason_breakdown: Record<string, number>;
  attributed: boolean;
  author_active: boolean | null;
  author_is_admin: boolean;
}
