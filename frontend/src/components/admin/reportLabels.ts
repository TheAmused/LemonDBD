// frontend/src/components/admin/reportLabels.ts
//
// Readable names and badge tones for both report queues (bug reports and content reports). A value
// the UI does not know prints as itself rather than disappearing.
import type { BadgeTone } from '@/components/common/Badge';
import type { Dictionary } from '@/locales/types';
import type { BugReportStatus, ContentReportStatus } from '@/types/admin';

type AdminDict = { admin: NonNullable<Dictionary['admin']> };
type AdminKey = keyof AdminDict['admin'];

export const BUG_STATUSES: readonly BugReportStatus[] = ['pending', 'in_progress', 'resolved', 'rejected'];
export const CONTENT_STATUSES: readonly ContentReportStatus[] = ['pending', 'resolved_banned', 'dismissed', 'expired'];

const BUG_STATUS_KEYS: Record<BugReportStatus, AdminKey> = {
  pending: 'statusPending',
  in_progress: 'statusInProgress',
  resolved: 'statusResolved',
  rejected: 'statusRejected',
};

const CONTENT_STATUS_KEYS: Record<ContentReportStatus, AdminKey> = {
  pending: 'contentStatusPending',
  resolved_banned: 'contentStatusBanned',
  dismissed: 'contentStatusDismissed',
  expired: 'contentStatusExpired',
};

const TYPE_KEYS: Record<string, AdminKey> = {
  tier_list: 'contentTypeTierList',
  smash_roster: 'contentTypeSmashRoster',
  minigame: 'contentTypeMinigame',
};

const REASON_KEYS: Record<string, AdminKey> = {
  hate_speech: 'contentReasonHate',
  harassment: 'contentReasonHarassment',
  explicit: 'contentReasonExplicit',
  illegal: 'contentReasonIllegal',
  spam: 'contentReasonSpam',
  other: 'contentReasonOther',
};

function lookup(dict: AdminDict, keys: Partial<Record<string, AdminKey>>, value: string): string {
  const key = keys[value];
  return key ? String(dict.admin[key] ?? value) : value;
}

export const bugStatusLabel = (dict: AdminDict, status: string) => lookup(dict, BUG_STATUS_KEYS, status);
export const contentStatusLabel = (dict: AdminDict, status: string) => lookup(dict, CONTENT_STATUS_KEYS, status);
export const contentTypeLabel = (dict: AdminDict, type: string) => lookup(dict, TYPE_KEYS, type);
export const contentReasonLabel = (dict: AdminDict, reason: string) => lookup(dict, REASON_KEYS, reason);

const BUG_TONES: Record<BugReportStatus, BadgeTone> = {
  pending: 'red',
  in_progress: 'amber',
  resolved: 'green',
  rejected: 'neutral',
};

const CONTENT_TONES: Record<ContentReportStatus, BadgeTone> = {
  pending: 'red',
  resolved_banned: 'amber',
  dismissed: 'green',
  expired: 'neutral',
};

export const bugStatusTone = (status: string): BadgeTone => BUG_TONES[status as BugReportStatus] ?? 'neutral';
export const contentStatusTone = (status: string): BadgeTone => CONTENT_TONES[status as ContentReportStatus] ?? 'neutral';
