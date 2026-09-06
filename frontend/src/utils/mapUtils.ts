// frontend/src/utils/mapUtils.ts
import type { MapRealm } from '@/types/map';
import { getBackendBaseUrl } from '@/utils/api';

const DEFAULT_BACKEND_BASE = getBackendBaseUrl();

/** Resolves a local static asset path (relative to backend/static/) plus a
 * remote fallback URL into one displayable src, preferring the local copy so
 * the app serves its own cached asset instead of hotlinking a third party. */
function resolveLocalOrRemoteImage(
  localPath: string | null | undefined,
  remoteUrl: string | null | undefined,
  backendBase: string
): string {
  const cleanBase = (backendBase || DEFAULT_BACKEND_BASE).replace(/\/+$/, '');
  if (localPath) {
    const clean = localPath.replace(/^\/?(static\/)?/, '');
    return `${cleanBase}/static/${clean}`;
  }
  return remoteUrl || '';
}

/**
 * Resolves the displayable image source URL for a map realm.
 * Handles local static paths by prefixing backendBase/static/ and remote URLs.
 */
export function getMapImageSrc(
  map: Partial<MapRealm> | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  if (!map) return '';
  return resolveLocalOrRemoteImage(map.callout_image_local_path, map.callout_image_url || map.image_url, backendBase);
}

export interface ChapterBannerImage {
  banner_url: string | null;
  banner_local_path: string | null;
}

/**
 * Resolves the displayable banner image source for an onboarding chapter,
 * preferring the locally downloaded copy over the remote wiki.gg URL, the
 * same local-then-remote precedence getMapImageSrc uses for map realms.
 */
export function getChapterBannerSrc(
  chapter: ChapterBannerImage | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  if (!chapter) return '';
  return resolveLocalOrRemoteImage(chapter.banner_local_path, chapter.banner_url, backendBase);
}
