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

export type MapSizeBucket = 'small' | 'medium' | 'large';

/** Upper bounds (exclusive, in m²) for the small and medium size buckets. */
export const MAP_SIZE_SMALL_MAX = 9000;
export const MAP_SIZE_MEDIUM_MAX = 10000;

const PALLET_DENSITY_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export function getMapSizeBucket(sizeSqMeters: number | null | undefined): MapSizeBucket | null {
  if (sizeSqMeters == null) return null;
  if (sizeSqMeters < MAP_SIZE_SMALL_MAX) return 'small';
  if (sizeSqMeters < MAP_SIZE_MEDIUM_MAX) return 'medium';
  return 'large';
}

export type MapStructureFilter = 'shack' | 'no_shack' | 'main_building' | 'no_main_building';

/** `null` on a field means "any value". */
export interface MapAttributeFilters {
  layoutType: string | null;
  palletDensity: string | null;
  size: MapSizeBucket | null;
  structure: MapStructureFilter | null;
}

export const EMPTY_MAP_FILTERS: MapAttributeFilters = {
  layoutType: null,
  palletDensity: null,
  size: null,
  structure: null,
};

export function hasActiveMapFilters(filters: MapAttributeFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

export function mapMatchesFilters(map: MapRealm, filters: MapAttributeFilters): boolean {
  if (filters.layoutType !== null && map.layout_type !== filters.layoutType) return false;
  if (filters.palletDensity !== null && map.pallet_density !== filters.palletDensity) return false;
  if (filters.size !== null && getMapSizeBucket(map.size_sq_meters) !== filters.size) return false;
  switch (filters.structure) {
    case 'shack':
      return map.is_shack;
    case 'no_shack':
      return !map.is_shack;
    case 'main_building':
      return map.is_main_building;
    case 'no_main_building':
      return !map.is_main_building;
    default:
      return true;
  }
}

/** Distinct layout types present in the data, alphabetically. */
export function getLayoutTypeOptions(maps: MapRealm[]): string[] {
  return [...new Set(maps.map((m) => m.layout_type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Distinct pallet densities present in the data, from lowest to highest. */
export function getPalletDensityOptions(maps: MapRealm[]): string[] {
  const rank = (v: string) => {
    const i = PALLET_DENSITY_ORDER.indexOf(v);
    return i === -1 ? PALLET_DENSITY_ORDER.length : i;
  };
  return [...new Set(maps.map((m) => m.pallet_density).filter(Boolean))].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b)
  );
}

export type MapSortOrder = 'az' | 'za';

/** Filters each realm's maps, drops realms left empty, and orders realms and maps by name. */
export function filterAndSortRealmGroups(
  groups: { realm: string; maps: MapRealm[] }[],
  filters: MapAttributeFilters,
  order: MapSortOrder
): { realm: string; maps: MapRealm[] }[] {
  const dir = order === 'za' ? -1 : 1;
  return groups
    .map(({ realm, maps }) => ({
      realm,
      maps: maps.filter((m) => mapMatchesFilters(m, filters)).sort((a, b) => dir * a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.maps.length > 0)
    .sort((a, b) => dir * a.realm.localeCompare(b.realm));
}
