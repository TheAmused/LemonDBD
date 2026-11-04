// frontend/src/components/smash-or-pass/roster-select/rosterDisplay.ts
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { coverPlaceholderPath } from '@/utils/smashOrPass/placeholderArt';

/** The roster's cover picture: its own, else the backend's static one by slug. */
export function rosterCoverUrl(r: RosterItem): string {
  if (r.cover_image_url) {
    return r.cover_image_url.startsWith('http') || r.cover_image_url.startsWith('data:')
      ? r.cover_image_url
      : `${getBackendBaseUrl()}${r.cover_image_url}`;
  }
  // A local roster has no cover of its own on the backend: it gets one of the stand-in covers (the same one every time).
  if (r.is_local) return `${getBackendBaseUrl()}${coverPlaceholderPath(r.slug)}`;
  return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
}

export function rosterDisplayName(r: RosterItem): string {
  return r.name || r.slug;
}
