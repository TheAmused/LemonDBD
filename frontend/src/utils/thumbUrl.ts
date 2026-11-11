// frontend/src/utils/thumbUrl.ts
import { getBackendBaseUrl } from '@/utils/api';

export type ThumbCategory =
  | 'avatars'
  | 'maps'
  | 'chapters'
  | 'realms'
  | 'icons'
  | 'smash-or-pass'
  | 'tier-lists'
  | 'community';

const CATEGORY_SUBDIR: Record<ThumbCategory, string> = {
  avatars: 'avatars',
  maps: 'maps',
  chapters: 'chapters',
  realms: 'realms',
  icons: 'icons',
  'smash-or-pass': 'smash-or-pass',
  'tier-lists': 'tier-lists',
  community: 'uploads/community',
};

const COMMUNITY_COVER_CATEGORIES: readonly { prefix: string; category: ThumbCategory }[] = [
  { prefix: 'uploads/community/', category: 'community' },
  { prefix: 'smash-or-pass/', category: 'smash-or-pass' },
  { prefix: 'tier-lists/', category: 'tier-lists' },
];

const RASTER_EXT_RE = /\.(?:webp|png|jpe?g)$/i;
const THUMB_ROUTE_PREFIX = '/api/v1/thumbs/';

function normalizeBase(backendBase?: string): string {
  return (backendBase ?? getBackendBaseUrl()).replace(/\/+$/, '');
}

function splitQueryHash(input: string): [string, string] {
  const idx = input.search(/[?#]/);
  return idx === -1 ? [input, ''] : [input.slice(0, idx), input.slice(idx)];
}

/**
 * Extracts a backend-static-relative path when the input is either a same-origin / backend-base
 * `/static/...` URL or a bare relative path. External origins, app-local `/images/...` paths, and
 * non-http schemes return `null` so callers pass them through unchanged.
 */
function extractStaticPath(
  trimmed: string,
  base: string
): { staticPath: string; fromStaticPrefix: boolean } | null {
  if (/^https?:\/\//i.test(trimmed)) {
    if (base && trimmed.startsWith(`${base}/static/`)) {
      return { staticPath: trimmed.slice(`${base}/static/`.length), fromStaticPrefix: true };
    }
    if (typeof window !== 'undefined' && trimmed.startsWith(`${window.location.origin}/static/`)) {
      return {
        staticPath: trimmed.slice(`${window.location.origin}/static/`.length),
        fromStaticPrefix: true,
      };
    }
    return null;
  }

  if (trimmed.startsWith('/static/')) {
    return { staticPath: trimmed.slice('/static/'.length), fromStaticPrefix: true };
  }
  if (trimmed.startsWith('/')) {
    return null;
  }
  if (trimmed.startsWith('static/')) {
    return { staticPath: trimmed.slice('static/'.length), fromStaticPrefix: true };
  }
  return { staticPath: trimmed, fromStaticPrefix: false };
}

/**
 * Rewrites a backend static raster asset path into `/api/v1/thumbs/<category>/<width>/<rel>`.
 * External URLs, `data:`/`blob:` URIs, app-relative non-static paths, and non-raster assets
 * (`.svg`, audio, JSON, etc.) are never rewritten to the thumbnail proxy.
 */
export function getThumbUrl(
  category: ThumbCategory,
  rawPathOrUrl: string | null | undefined,
  width: number,
  backendBase?: string
): string {
  if (!rawPathOrUrl) return '';
  const trimmed = rawPathOrUrl.trim();
  if (!trimmed) return '';

  const base = normalizeBase(backendBase);

  if (/^(?:data|blob):/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith(THUMB_ROUTE_PREFIX)) return base ? `${base}${trimmed}` : trimmed;
  if (base && trimmed.startsWith(`${base}${THUMB_ROUTE_PREFIX}`)) return trimmed;

  const extracted = extractStaticPath(trimmed, base);
  if (!extracted) return trimmed;

  const [rawPath, suffix] = splitQueryHash(extracted.staticPath);
  const cleanPath = rawPath.replace(/^\/+/, '');
  if (!cleanPath) return '';

  const subdir = CATEGORY_SUBDIR[category];
  const matchesSubdir = cleanPath.startsWith(`${subdir}/`);

  if (extracted.fromStaticPrefix && !matchesSubdir) {
    return base ? `${base}/static/${cleanPath}${suffix}` : `/static/${cleanPath}${suffix}`;
  }

  const rel = matchesSubdir ? cleanPath.slice(subdir.length + 1) : cleanPath;
  if (!rel) return '';

  if (!RASTER_EXT_RE.test(rel)) {
    return base ? `${base}/static/${cleanPath}${suffix}` : `/static/${cleanPath}${suffix}`;
  }

  return `${base}${THUMB_ROUTE_PREFIX}${category}/${width}/${rel}${suffix}`;
}

/** Resolves a character avatar path or static URL into a resized WebP thumbnail URL. */
export function avatarThumbFromPath(
  rawPath: string | null | undefined,
  width = 256,
  backendBase?: string
): string {
  if (!rawPath) return '';
  return getThumbUrl('avatars', rawPath, width, backendBase);
}

/** Resolves a chapter banner record or path into a resized WebP thumbnail URL. */
export function getChapterThumbSrc(
  chapter:
    | {
        banner_local_path?: string | null;
        banner_path?: string | null;
        banner_url?: string | null;
      }
    | string
    | null
    | undefined,
  width = 480,
  backendBase?: string
): string {
  if (!chapter) return '';
  if (typeof chapter === 'string') return getThumbUrl('chapters', chapter, width, backendBase);
  const local = chapter.banner_local_path ?? chapter.banner_path;
  if (local) return getThumbUrl('chapters', local, width, backendBase);
  if (chapter.banner_url) return getThumbUrl('chapters', chapter.banner_url, width, backendBase);
  return '';
}

/** Resolves a realm artwork path or static URL into a resized WebP thumbnail URL. */
export function getRealmThumbSrc(
  rawPath: string | null | undefined,
  width = 320,
  backendBase?: string
): string {
  return getThumbUrl('realms', rawPath, width, backendBase);
}

/** Resolves an icon path or static URL into a resized WebP thumbnail URL. */
export function getIconThumbUrl(
  rawPathOrUrl: string | null | undefined,
  width = 128,
  backendBase?: string
): string {
  return getThumbUrl('icons', rawPathOrUrl, width, backendBase);
}

/**
 * Resolves cover images stored under `/static/uploads/community/`, `/static/smash-or-pass/`, or
 * `/static/tier-lists/` into thumbnails while leaving external, `data:`, and unknown paths untouched.
 */
export function getCommunityCoverThumbUrl(
  url: string | null | undefined,
  width = 480,
  backendBase?: string
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const base = normalizeBase(backendBase);

  if (/^(?:data|blob):/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith(THUMB_ROUTE_PREFIX)) return base ? `${base}${trimmed}` : trimmed;
  if (base && trimmed.startsWith(`${base}${THUMB_ROUTE_PREFIX}`)) return trimmed;

  const extracted = extractStaticPath(trimmed, base);
  if (!extracted) return trimmed;

  const [rawPath] = splitQueryHash(extracted.staticPath);
  const cleanPath = rawPath.replace(/^\/+/, '');
  const match = COMMUNITY_COVER_CATEGORIES.find((entry) => cleanPath.startsWith(entry.prefix));
  if (!match) return trimmed;

  return getThumbUrl(match.category, trimmed, width, backendBase);
}
