// frontend/src/utils/smashOrPass/guestSession.ts
/**
 * The smash-or-pass guest session: the random id a signed-out player's votes
 * are filed under on the backend.
 *
 * It is a bearer secret (whoever holds it can reset those votes), so it is
 * never shared between people:
 *   * when localStorage is unavailable each tab gets its own in-memory id
 *     instead of one fixed fallback string every such visitor would share;
 *   * it is replaced on logout and once a sign-in has claimed its votes, so the
 *     next person on a shared browser starts a fresh session.
 */
import { forgetAccountVotes } from '@/components/smash-or-pass/hub/voteStorage';

export const SMASH_SESSION_KEY = 'smash_session_id';

let memorySessionId: string | null = null;

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `sess_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 11)}`;
}

/** This browser's guest session id, created on first use. */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_smash_session';
  try {
    let sessionId = localStorage.getItem(SMASH_SESSION_KEY);
    if (!sessionId) {
      sessionId = newSessionId();
      localStorage.setItem(SMASH_SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    if (!memorySessionId) memorySessionId = newSessionId();
    return memorySessionId;
  }
}

/** Starts a new guest session (the old id is simply forgotten). */
export function rotateSmashSession(): void {
  memorySessionId = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMASH_SESSION_KEY, newSessionId());
  } catch {
    // Storage unavailable: the next getSessionId() mints a fresh in-memory id.
  }
}

/**
 * Logout on this browser: a new guest session, and the account's cached vote
 * history for official rosters forgotten (it lives on the account and comes
 * back on the next sign-in). Votes on the device's own local rosters stay.
 */
export function resetSmashGuestStateOnLogout(): void {
  rotateSmashSession();
  forgetAccountVotes();
}
