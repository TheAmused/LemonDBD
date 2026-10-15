// frontend/src/components/admin/contentReportLabels.ts
import type { BadgeTone } from '@/components/common/Badge';
import type { Dictionary } from '@/locales/types';
import type { ContentReportStatus } from '@/types/admin';

type AdminDict = { admin: NonNullable<Dictionary['admin']> };

/** Every status the backend can store, as a dictionary key: a status the UI does not know prints as itself. */
const STATUS_KEYS = {
  pending: 'contentStatusPending',
  resolved_banned: 'contentStatusBanned',
  dismissed: 'contentStatusDismissed',
  expired: 'contentStatusExpired',
} as const;

const TYPE_KEYS = {
  tier_list: 'contentTypeTierList',
  smash_roster: 'contentTypeSmashRoster',
  minigame: 'contentTypeMinigame',
} as const;

const REASON_KEYS = {
  hate_speech: 'contentReasonHate',
  harassment: 'contentReasonHarassment',
  explicit: 'contentReasonExplicit',
  illegal: 'contentReasonIllegal',
  spam: 'contentReasonSpam',
  other: 'contentReasonOther',
} as const;

function lookup<K extends string>(dict: AdminDict, keys: Record<string, K>, value: string): string {
  const key = keys[value];
  return key ? String(dict.admin[key as keyof typeof dict.admin] ?? value) : value;
}

export const contentStatusLabel = (dict: AdminDict, status: string) => lookup(dict, STATUS_KEYS, status);
export const contentTypeLabel = (dict: AdminDict, type: string) => lookup(dict, TYPE_KEYS, type);
export const contentReasonLabel = (dict: AdminDict, reason: string) => lookup(dict, REASON_KEYS, reason);

export function contentStatusTone(status: ContentReportStatus): BadgeTone {
  switch (status) {
    case 'pending':
      return 'red';
    case 'resolved_banned':
      return 'amber';
    case 'dismissed':
      return 'green';
    default:
      return 'neutral';
  }
}
