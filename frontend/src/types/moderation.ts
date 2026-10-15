// frontend/src/types/moderation.ts
//
// Warnings, suspensions and bans (backend: services/moderation_actions.py, models/sanction.py).

export const SANCTION_KINDS = ['warning', 'suspension', 'ban'] as const;
export type SanctionKind = (typeof SANCTION_KINDS)[number];

/** The ground of a decision: the report categories plus the two that only make sense for an account. */
export const SANCTION_REASONS = [
  'hate_speech',
  'harassment',
  'explicit',
  'illegal',
  'spam',
  'cheating',
  'ban_evasion',
  'other',
] as const;
export type SanctionReason = (typeof SANCTION_REASONS)[number];

/** Sections of the Rules page a decision can cite (keys of `rules.sections`). */
export const RULE_REFS = [
  'respect',
  'fairPlay',
  'yourContent',
  'smashOrPass',
  'serverCare',
  'reporting',
  'enforcement',
] as const;
export type RuleRef = (typeof RULE_REFS)[number];

export const MIN_SUSPENSION_DAYS = 1;
export const MAX_SUSPENSION_DAYS = 365;
const DEFAULT_SUSPENSION_DAYS = 7;

/** A warning as its owner sees it (no internal notes, no moderator, no report). */
export interface UserWarning {
  id: number;
  kind: 'warning';
  reason_code: string;
  rule_ref: string | null;
  facts: string | null;
  public_message: string | null;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

/** The 403 body of a sign-in by a banned or suspended account. */
export interface BlockedInfo {
  code: 'account_banned' | 'account_suspended';
  until: string | null;
  reason_code: string | null;
  public_message: string | null;
  appeal_contact: string | null;
}

export interface AdminSanction {
  id: number;
  user_id: number;
  kind: SanctionKind;
  reason_code: string;
  rule_ref: string | null;
  facts: string | null;
  public_message: string | null;
  internal_notes: string | null;
  source: 'manual' | 'content_report';
  report_id: number | null;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  acknowledged_at: string | null;
  /** In force right now (not revoked, not expired). */
  active: boolean;
  issued_by_login: string | null;
  revoked_by_login: string | null;
}

/** What the escalation ladder would do next (backend: services/escalation.py). Only a suggestion. */
export interface ModerationSuggestion {
  kind: SanctionKind;
  duration_days: number | null;
  basis: { active_warnings: number; warnings_before_suspension: number; suspensions: number };
}

export interface ModerationSummary {
  active_warnings: number;
  total_warnings: number;
  total_suspensions: number;
  banned: boolean;
  /** Null when the account is already banned. */
  suggestion: ModerationSuggestion | null;
  suspended_until: string | null;
  content_blocked: number;
}

export interface UserSanctions {
  sanctions: AdminSanction[];
  summary: ModerationSummary;
}

/** What the admin typed into the decision form (shared by the user drawer and the report case). */
export interface SanctionDraft {
  kind: SanctionKind;
  reason_code: SanctionReason;
  rule_ref: RuleRef | '';
  duration_days: number;
  facts: string;
  public_message: string;
  internal_notes: string;
  send_email: boolean;
}

export const EMPTY_SANCTION_DRAFT: SanctionDraft = {
  kind: 'warning',
  reason_code: 'other',
  rule_ref: '',
  duration_days: DEFAULT_SUSPENSION_DAYS,
  facts: '',
  public_message: '',
  internal_notes: '',
  send_email: true,
};

/** The form with the suggested kind (and length) filled in; whatever the admin already typed stays. */
export function draftFromSuggestion(draft: SanctionDraft, suggestion: ModerationSuggestion): SanctionDraft {
  return { ...draft, kind: suggestion.kind, duration_days: suggestion.duration_days ?? draft.duration_days };
}

/** The decision form is complete: a suspension or ban needs the facts (the evidence itself is wiped). */
export function isSanctionDraftValid(draft: SanctionDraft): boolean {
  if (draft.kind !== 'warning' && draft.facts.trim().length === 0) return false;
  if (draft.kind === 'suspension') {
    return (
      Number.isInteger(draft.duration_days) &&
      draft.duration_days >= MIN_SUSPENSION_DAYS &&
      draft.duration_days <= MAX_SUSPENSION_DAYS
    );
  }
  return true;
}

/** The request body for a manual decision (empty optional fields are left out). */
export function sanctionRequestBody(draft: SanctionDraft): Record<string, unknown> {
  const text = (value: string) => value.trim() || undefined;
  return {
    kind: draft.kind,
    reason_code: draft.reason_code,
    rule_ref: draft.rule_ref || undefined,
    duration_days: draft.kind === 'suspension' ? draft.duration_days : undefined,
    facts: text(draft.facts),
    public_message: text(draft.public_message),
    internal_notes: text(draft.internal_notes),
    send_email: draft.send_email,
  };
}

/** Where an account stands right now, from the user list's `is_active` / `suspended_until`. */
export type AccountStanding = 'active' | 'suspended' | 'banned';

export function accountStanding(
  user: { is_active: boolean; suspended_until?: string | null },
  now: number = Date.now()
): AccountStanding {
  if (!user.is_active) return 'banned';
  if (user.suspended_until && new Date(user.suspended_until).getTime() > now) return 'suspended';
  return 'active';
}

/** What happens to a reported item's author when the item is blocked (the request's `author_action`). */
const AUTHOR_ACTIONS = { warning: 'warn', suspension: 'suspend', ban: 'ban' } as const;
export type AuthorAction = (typeof AUTHOR_ACTIONS)[SanctionKind];

export interface AuthorDecision {
  author_action: AuthorAction;
  duration_days?: number;
  facts?: string;
  public_message?: string;
  rule_ref?: string;
}

/** The report resolution's author part from the decision form (the report supplies the reason). */
export function authorDecisionFromDraft(draft: SanctionDraft): AuthorDecision {
  const text = (value: string) => value.trim() || undefined;
  return {
    author_action: AUTHOR_ACTIONS[draft.kind],
    duration_days: draft.kind === 'suspension' ? draft.duration_days : undefined,
    facts: text(draft.facts),
    public_message: text(draft.public_message),
    rule_ref: draft.rule_ref || undefined,
  };
}
