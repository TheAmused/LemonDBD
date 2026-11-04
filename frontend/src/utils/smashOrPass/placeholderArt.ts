// frontend/src/utils/smashOrPass/placeholderArt.ts
/**
 * Stand-in pictures for a custom roster's candidates and cover when its author gave none. Like the
 * tier lists' custom banners, there are three of each, and one is picked by hashing a stable key:
 * it looks random across candidates and rosters, but each keeps the same picture on every render
 * and visit (a Math.random() here would reshuffle on each re-render and differ between server and
 * client HTML).
 *
 * The pictures are six character portraits, all 768x1024 (3:4, the card's shape) WebP, in
 * `backend/app/static/smash-or-pass/`: three for candidates, three for covers (shown cropped to the
 * carousel card by `object-cover`).
 */

const CANDIDATE_PLACEHOLDERS = [
  '/static/smash-or-pass/candidate_placeholder_1.webp',
  '/static/smash-or-pass/candidate_placeholder_2.webp',
  '/static/smash-or-pass/candidate_placeholder_3.webp',
] as const;

const COVER_PLACEHOLDERS = [
  '/static/smash-or-pass/cover_placeholder_1.webp',
  '/static/smash-or-pass/cover_placeholder_2.webp',
  '/static/smash-or-pass/cover_placeholder_3.webp',
] as const;

/** One of `options`, chosen by a hash of `key`: the same key always gets the same one. */
function pickFor<T>(key: string, options: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return options[hash % options.length];
}

/** The static path of a candidate's stand-in picture; `key` is something stable, such as its id. */
export function candidatePlaceholderPath(key: string): string {
  return pickFor(key, CANDIDATE_PLACEHOLDERS);
}

/** The static path of a roster's stand-in cover; `key` is something stable, such as its slug. */
export function coverPlaceholderPath(key: string): string {
  return pickFor(key, COVER_PLACEHOLDERS);
}
