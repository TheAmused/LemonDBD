// frontend/src/components/admin/settingsForm.ts
//
// The pure parts of the Settings tab: how a setting becomes the text in its field, when the field
// counts as changed, which changes lower a protection, and the local-time <-> UTC conversion for the
// banner's end time. The server validates everything again; these checks only spare a round trip.
import { i18n } from '@/i18n/config';
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

/** Settings that hold one text per language: English under the key itself, every other language under `<key>_<code>`. */
export const TRANSLATED_TEXT_KEYS: readonly string[] = ['site_banner_text', 'donation_message'];
const TRANSLATION_CODES: readonly string[] = i18n.locales.filter((locale) => locale !== i18n.defaultLocale);

/** The keys holding the other languages of a translated text (none for any other setting). */
export function translationKeys(key: string): string[] {
  return TRANSLATED_TEXT_KEYS.includes(key) ? TRANSLATION_CODES.map((code) => `${key}_${code}`) : [];
}

/** A setting that is one language of a translated text: shown inside the text's own field, not as a row. */
export function isTranslationKey(key: string): boolean {
  return TRANSLATED_TEXT_KEYS.some((base) => translationKeys(base).includes(key));
}

/**
 * Settings of a feature the site does not offer at the moment (the scoreboard screenshot check, OCR). They stay
 * in the list so they are there when the feature comes back, but cannot be edited or reset from this tab.
 */
export const LOCKED_SETTING_KEYS: readonly string[] = ['scoreboard_ocr_enabled', 'rate_scoreboard_per_minute', 'scoreboard_upload_max_mb'];

/** The text a field starts with. A secret never has any: the server does not send it back. */
export function draftOf(row: AdminSiteSetting): string {
  if (row.kind === 'secret' || row.value === null) return '';
  return String(row.value);
}

export function isDraftDirty(row: AdminSiteSetting, draft: string): boolean {
  return row.kind === 'secret' ? draft.trim() !== '' : draft.trim() !== draftOf(row);
}

/** The text a field holds at its default value; null for a secret, which has no default to compare with. */
export function defaultDraftOf(row: AdminSiteSetting): string | null {
  if (row.kind === 'secret') return null;
  return row.default === null ? '' : String(row.default);
}

/** The field holds the default value, however it got there (typed, or put back with the reset button). */
export function isDraftDefault(row: AdminSiteSetting, draft: string): boolean {
  const base = defaultDraftOf(row);
  return base !== null && draft.trim() === base;
}

/** What to send for a changed field. The default is sent as null, which removes the override, so a value that is back to the default is no longer "custom". */
export function payloadValue(row: AdminSiteSetting, draft: string): SiteSettingValue | null {
  if (isDraftDefault(row, draft)) return null;
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
