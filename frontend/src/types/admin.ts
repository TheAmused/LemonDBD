// frontend/src/types/admin.ts

/** GET /admin/stats: the counts behind the admin panel's filters and its "needs attention" markers. */
export interface AdminOverview {
  users: {
    total: number;
    admins: number;
    players: number;
    active: number;
    suspended: number;
    banned: number;
  };
  pending: {
    bug_reports: number;
    content_reports: number;
  };
}

export type UserRoleFilter = 'all' | 'admin' | 'user';
export type UserStandingFilter = 'all' | 'active' | 'suspended' | 'banned';

export interface UserRow {
  id: number;
  login: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified?: boolean;
  /** End of the longest running suspension; a past value is stale (see accountStanding). */
  suspended_until?: string | null;
  created_at: string;
  owned_characters_count: number;
  unlocked_perks_count: number;
  two_factor_enabled?: boolean;
}

/** What an admin may change on an account (PUT /users/<id>). */
export interface UserPatch {
  username?: string;
  role?: 'user' | 'admin';
  is_verified?: boolean;
  /** The acting admin's own password; the server requires it to demote another admin. */
  current_password?: string;
}

export interface NewUser {
  login: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

export type BugReportStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface AdminBugReport {
  id: number;
  user_id?: number | null;
  reporter_name: string;
  reporter_email?: string;
  title: string;
  message: string;
  images: string[];
  status: BugReportStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

/** Reports per status plus `total`, whatever filter the list is showing (the queue's filter chips). */
export type QueueStats<S extends string> = Record<S | 'total', number>;

export interface AdminBugReportList {
  reports: AdminBugReport[];
  stats: QueueStats<BugReportStatus>;
  total: number;
}

export interface ActionMessage {
  type: 'success' | 'error';
  text: string;
}

export interface AdminCharacterRow {
  id: number;
  name: string;
  role: 'Survivor' | 'Killer';
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

export interface AdminAuditLogPage {
  logs: AdminAuditLogEntry[];
  total: number;
}

export type SiteSettingGroup =
  | 'notices'
  | 'access'
  | 'links'
  | 'limits'
  | 'tokens'
  | 'integrations'
  | 'moderation'
  | 'bug_reports'
  | 'retention'
  | 'privacy';

export type SiteSettingKind = 'int' | 'email' | 'bool' | 'url' | 'text' | 'choice' | 'datetime' | 'secret';

export type SiteSettingValue = string | number | boolean;

export interface AdminSiteSetting {
  key: string;
  kind: SiteSettingKind;
  group: SiteSettingGroup;
  /** Null for a secret: the server never sends one back. */
  value: SiteSettingValue | null;
  default: SiteSettingValue | null;
  overridden: boolean;
  min: number | null;
  max: number | null;
  max_length: number;
  choices: string[];
  allow_empty: boolean;
  /** For a switch: the value that lowers a protection and needs a confirmation with a reason. */
  risky_when: boolean | null;
  /** Secrets only: the deployment itself provides a value (used while the admin has set none). */
  env_set?: boolean;
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
  stats: QueueStats<ContentReportStatus>;
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

export type SystemCheckState = 'ok' | 'warn' | 'off' | 'error';

/** One line of GET /admin/system. `detail` is a technical identifier (engine, provider), never prose. */
export interface SystemCheck {
  key: string;
  state: SystemCheckState;
  detail: string | null;
  latency_ms?: number;
  /** The scheduler's heartbeat: its most recent recorded run. */
  last_run_at?: string;
}

export interface MaintenanceRun {
  last_run_at: string | null;
  last_affected: number;
  last_trigger: 'schedule' | 'admin';
}

export interface MaintenanceJob {
  key: string;
  last_run: MaintenanceRun | null;
}
