// frontend/src/utils/moderationResponse.ts
//
// Reads the moderation parts of the auth responses: the 403 a banned or suspended account gets
// at sign-in, and the `moderation.warnings` list that /auth/me and every completed sign-in carry.
import type { BlockedInfo, UserWarning } from '@/types/moderation';

const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** The block described by a sign-in error body, or undefined when the failure is something else. */
export function blockedFromResponse(status: number, data: unknown): BlockedInfo | undefined {
  if (status !== 403 || typeof data !== 'object' || data === null) return undefined;
  const body = data as Record<string, unknown>;
  if (body.code !== 'account_banned' && body.code !== 'account_suspended') return undefined;
  return {
    code: body.code,
    until: str(body.until),
    reason_code: str(body.reason_code),
    appeal_contact: str(body.appeal_contact),
  };
}

/** The unacknowledged warnings of a /auth/me or sign-in body (anything malformed counts as none). */
export function warningsFromResponse(data: unknown): UserWarning[] {
  if (typeof data !== 'object' || data === null) return [];
  const moderation = (data as { moderation?: { warnings?: unknown } }).moderation;
  if (!moderation || !Array.isArray(moderation.warnings)) return [];
  return moderation.warnings.filter(
    (w): w is UserWarning => typeof w === 'object' && w !== null && typeof (w as UserWarning).id === 'number'
  );
}
