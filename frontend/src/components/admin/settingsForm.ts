// frontend/src/components/admin/settingsForm.ts
//
// The pure parts of the Settings tab: how a setting becomes the text in its field, when the field
// counts as changed, which changes lower a protection, and the local-time <-> UTC conversion for the
// banner's end time. The server validates everything again; these checks only spare a round trip.
import type { AdminSiteSetting, SiteSettingGroup, SiteSettingValue } from '@/types/admin';

/** Top to bottom: what an admin reaches for in an incident first, then the everyday tuning. */
export const SETTING_GROUP_ORDER: readonly SiteSettingGroup[] = [
  'notices',
  'access',
  'links',
  'limits',
  'tokens',
  'integrations',
  'moderation',
  'bug_reports',
  'retention',
  'privacy',
];

/** The text a field starts with. A secret never has any: the server does not send it back. */
export function draftOf(row: AdminSiteSetting): string {
  if (row.kind === 'secret' || row.value === null) return '';
  return String(row.value);
}

export function isDraftDirty(row: AdminSiteSetting, draft: string): boolean {
  return row.kind === 'secret' ? draft.trim() !== '' : draft.trim() !== draftOf(row);
}

export function payloadValue(row: AdminSiteSetting, draft: string): SiteSettingValue {
  return row.kind === 'bool' ? draft === 'true' : draft.trim();
}

/** True when saving this draft would lower a protection (needs a confirmation and a reason). */
export function isRiskyDraft(row: AdminSiteSetting, draft: string): boolean {
  return row.kind === 'bool' && row.risky_when !== null && (draft === 'true') === row.risky_when && isDraftDirty(row, draft);
}

export type DraftProblem = 'number' | 'range' | 'link' | 'length' | null;

export function draftProblem(row: AdminSiteSetting, draft: string): DraftProblem {
  const value = draft.trim();
  if (row.kind === 'int') {
    if (!/^-?\d+$/.test(value)) return 'number';
    const number = Number(value);
    if ((row.min !== null && number < row.min) || (row.max !== null && number > row.max)) return 'range';
    return null;
  }
  if (row.kind === 'url' || row.kind === 'secret') {
    if (value === '' && (row.allow_empty || row.kind === 'secret')) return null;
    return /^https:\/\/[^\s/]+\.[^\s/]+/i.test(value) && value.length <= row.max_length ? null : 'link';
  }
  if (row.kind === 'text') {
    if (value.length > row.max_length) return 'length';
    return value === '' && !row.allow_empty ? 'length' : null;
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC ISO time (as the server stores it) -> the value of a `datetime-local` input, in the admin's time zone. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value (the admin's time zone) -> the UTC ISO time the server stores; '' stays ''. */
export function localInputToIso(local: string): string {
  if (!local) return '';
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** The unit shown beside a number, from the key's last word; null for plain counts. */
export function unitOf(key: string): 'hours' | 'minutes' | 'days' | 'seconds' | 'mb' | 'perMinute' | null {
  const suffix = key.split('_').pop();
  if (suffix === 'hours' || suffix === 'minutes' || suffix === 'days' || suffix === 'seconds' || suffix === 'mb') return suffix;
  return suffix === 'minute' ? 'perMinute' : null;
}
