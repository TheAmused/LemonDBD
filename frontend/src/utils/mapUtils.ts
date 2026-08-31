// frontend/src/utils/mapUtils.ts
import type { MapRealm } from '@/types/map';

const DEFAULT_BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Resolves the displayable image source URL for a map realm.
 * Handles local static paths by prefixing backendBase/static/ and remote URLs.
 */
export function getMapImageSrc(
  map: Partial<MapRealm> | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  if (!map) return '';
  const cleanBase = (backendBase || DEFAULT_BACKEND_BASE).replace(/\/+$/, '');
  if (map.callout_image_local_path) {
    const clean = map.callout_image_local_path.replace(/^\/?(static\/)?/, '');
    return `${cleanBase}/static/${clean}`;
  }
  return map.callout_image_url || map.image_url || '';
}
