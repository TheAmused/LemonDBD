// frontend/src/utils/privacyPlaceholders.ts
//
// The Privacy Policy text quotes live site facts (contact address, token lifetimes...). The
// translations hold placeholders and these helpers fill them from `GET /api/v1/privacy-info`,
// so a lifetime or the contact address changes in the admin Configuration tab only.

export interface PrivacyInfo {
  contactEmail: string;
  mailProvider: string;
  verificationSeconds: number;
  resetSeconds: number;
  sessionSeconds: number;
  streakPruneSeconds: number;
}

const DAY = 86_400;
const HOUR = 3_600;

/** "24 hours", "1 hour", "3 days", "45 minutes"... localized through Intl. */
export function formatWindow(seconds: number, locale: string): string {
  let value: number;
  let unit: 'day' | 'hour' | 'minute';
  if (seconds >= DAY && seconds % DAY === 0) {
    value = seconds / DAY;
    unit = 'day';
  } else if (seconds >= HOUR && seconds % HOUR === 0) {
    value = seconds / HOUR;
    unit = 'hour';
  } else {
    value = Math.max(1, Math.round(seconds / 60));
    unit = 'minute';
  }
  try {
    return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);
  } catch {
    return `${value} ${unit}${value === 1 ? '' : 's'}`;
  }
}

/** Replaces `{contactEmail}`, `{mailProvider}`, `{verificationWindow}`, `{resetWindow}`,
 *  `{sessionWindow}` and `{streakPrune}`; unknown values (still loading) become "…". */
export function fillPrivacyPlaceholders(text: string, info: PrivacyInfo | null, locale: string): string {
  const values: Record<string, string> = {
    contactEmail: info?.contactEmail || '…',
    mailProvider: info?.mailProvider || '…',
    verificationWindow: info ? formatWindow(info.verificationSeconds, locale) : '…',
    resetWindow: info ? formatWindow(info.resetSeconds, locale) : '…',
    sessionWindow: info ? formatWindow(info.sessionSeconds, locale) : '…',
    streakPrune: info ? formatWindow(info.streakPruneSeconds, locale) : '…',
  };
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}
