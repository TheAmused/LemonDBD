// frontend/src/utils/streakRole.ts
// The remembered challenge tab, kept free of imports so the proxy (edge of the request) can read it too.

export type StreakRole = 'survivor' | 'killer' | 'challenge';

/** The server redirect from /streaks reads this cookie, so the saved role has to live in a cookie too. */
export const STREAK_ROLE_COOKIE = 'lemon_dbd_streaks_last_role';

/** The tab a visitor lands on from a bare /streaks: the one saved last, killer on a first visit. */
export function resolveStreakRole(saved: string | undefined): StreakRole {
  return saved === 'survivor' || saved === 'challenge' ? saved : 'killer';
}
