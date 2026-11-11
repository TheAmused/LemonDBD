const THUMBNAIL_PREFIXES = ['tarot/', 'streaks/', 'randomizer/'] as const;
const RASTER_EXT_RE = /\.(?:webp|png|jpe?g)$/i;

/**
 * Maps bundled `public/images/` paths covered by `scripts/build-public-thumbs.mjs`
 * to their pre-generated WebP thumbnail under `/images/_thumbs/`.
 * External URLs, data URIs, already-thumbnailed paths, and uncovered directories
 * are returned unchanged.
 */
export function publicImageThumb(publicPath: string): string {
  if (!publicPath.startsWith('/images/') || publicPath.startsWith('/images/_thumbs/')) {
    return publicPath;
  }

  const relWithSuffix = publicPath.slice('/images/'.length);
  const queryOrHashIdx = relWithSuffix.search(/[?#]/);
  const rel = queryOrHashIdx === -1 ? relWithSuffix : relWithSuffix.slice(0, queryOrHashIdx);
  const suffix = queryOrHashIdx === -1 ? '' : relWithSuffix.slice(queryOrHashIdx);

  if (!THUMBNAIL_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
    return publicPath;
  }

  if (!RASTER_EXT_RE.test(rel)) {
    return publicPath;
  }

  const normalizedRel = rel.replace(RASTER_EXT_RE, '.webp');
  return `/images/_thumbs/${normalizedRel}${suffix}`;
}
