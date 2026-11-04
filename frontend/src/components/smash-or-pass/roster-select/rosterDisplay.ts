// frontend/src/components/smash-or-pass/roster-select/rosterDisplay.ts
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { coverPlaceholderPath } from '@/utils/smashOrPass/placeholderArt';

/** The roster's cover picture: its own, else one of the stand-in covers (always the same one for a roster). */
export function rosterCoverUrl(r: RosterItem): string {
  if (r.cover_image_url) {
    return r.cover_image_url.startsWith('http') || r.cover_image_url.startsWith('data:')
      ? r.cover_image_url
      : `${getBackendBaseUrl()}${r.cover_image_url}`;
  }
  return `${getBackendBaseUrl()}${coverPlaceholderPath(r.slug)}`;
}

export function rosterDisplayName(r: RosterItem): string {
  return r.name || r.slug;
}
