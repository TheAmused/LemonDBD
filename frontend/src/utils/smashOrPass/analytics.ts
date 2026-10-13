// frontend/src/utils/smashOrPass/analytics.ts
import { isLocalRosterSlug } from './localRoster';

/** What the roster is called in analytics: the slug of an official one, 'custom' for any user made one. */
export function rosterTag(slug: string): string {
  return isLocalRosterSlug(slug) ? 'custom' : slug;
}

/** `play(slug)` is true the first time a roster is voted on in this page visit. Keyed on the real slug. */
export function createRosterPlayTracker(): (slug: string) => boolean {
  const seen = new Set<string>();
  return (slug) => {
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  };
}
