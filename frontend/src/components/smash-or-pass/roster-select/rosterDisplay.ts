// frontend/src/components/smash-or-pass/roster-select/rosterDisplay.ts
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';

/** The roster's cover picture: its own, else the backend's static one by slug. */
export function rosterCoverUrl(r: RosterItem): string {
  if (r.cover_image_url) {
    return r.cover_image_url.startsWith('http') || r.cover_image_url.startsWith('data:')
      ? r.cover_image_url
      : `${getBackendBaseUrl()}${r.cover_image_url}`;
  }
  // A local roster has no backend static asset to fall back to.
  if (r.is_local) return `${getBackendBaseUrl()}/static/avatars/survivors/sable_ward.webp`;
  return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
}

export function rosterDisplayName(r: RosterItem): string {
  return r.name || r.slug;
}
