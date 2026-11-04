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

/**
 * Where card `index` sits relative to the centre of a looping carousel at `position` (fractional while it
 * moves): the signed distance, wrapped into half a turn either way. A card exactly opposite the centre
 * (the other card of two) is as far one way as the other; `tieSide` (1 right, -1 left) says which side it stays on.
 */
export function carouselOffset(index: number, position: number, count: number, tieSide: 1 | -1): number {
  const raw = (((index - position) % count) + count) % count;
  if (Math.abs(raw - count / 2) < 1e-9) return (tieSide * count) / 2;
  return raw > count / 2 ? raw - count : raw;
}

/** The side a card opposite the centre was last seen on: the way the carousel sits off its resting place (0 when it sits on it). */
export function tieSideOf(position: number): 1 | -1 | 0 {
  const drift = position - Math.round(position);
  return drift > 1e-6 ? 1 : drift < -1e-6 ? -1 : 0;
}
