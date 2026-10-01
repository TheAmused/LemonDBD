// frontend/src/utils/format.ts
// Shared locale-aware date/number formatting so components stop hand-rolling
// `new Date(x).toLocale*String(...)` with slightly different guards.

export type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date only (toLocaleDateString). Returns '' for empty / invalid input. */
export function formatDate(
  value: DateInput,
  locale?: string | string[],
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(value);
  if (!d) return '';
  try {
    return d.toLocaleDateString(locale, opts);
  } catch {
    return '';
  }
}

/** Date + time (toLocaleString). Returns '' for empty / invalid input. */
export function formatDateTime(
  value: DateInput,
  locale?: string | string[],
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(value);
  if (!d) return '';
  try {
    return d.toLocaleString(locale, opts);
  } catch {
    return '';
  }
}

/** Number with locale grouping (toLocaleString). */
export function formatNumber(
  value: number,
  locale?: string | string[],
  opts?: Intl.NumberFormatOptions
): string {
  return value.toLocaleString(locale, opts);
}
