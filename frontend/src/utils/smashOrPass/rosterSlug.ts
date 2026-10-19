// frontend/src/utils/smashOrPass/rosterSlug.ts
/**
 * What a custom (browser-only) roster's slug looks like: `local:<its storage id>`, which can never
 * collide with a real backend slug. Kept free of imports so code that runs on every page (the auth
 * provider's logout reset, via `voteStorage`) can tell the two apart without bundling the roster
 * document code in `localRoster.ts`.
 */
export const LOCAL_ROSTER_PREFIX = 'local:';

export function isLocalRosterSlug(slug: string | undefined | null): boolean {
  return typeof slug === 'string' && slug.startsWith(LOCAL_ROSTER_PREFIX);
}
