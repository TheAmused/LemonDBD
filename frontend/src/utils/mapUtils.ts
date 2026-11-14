// frontend/src/utils/mapUtils.ts
import type { MapRealm } from '@/types/map';
import type { AnalyticsEvents } from '@/utils/analytics';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl } from '@/utils/api';
import { getThumbUrl } from '@/utils/thumbUrl';

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

/** The in-game photo of a map (about 1000 px wide), or '' when the map has none. */
export function getMapPhotoSrc(
  map: Partial<MapRealm> | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  return resolveLocalOrRemoteImage(map?.photo_local_path, '', backendBase);
}

/**
 * A small (~320 px) copy of a map's picture for thumbnails: its in-game photo,
 * or the callout image when it has none. The callout images are ~2000x2200 px,
 * and a grid of tiny tiles must not decode dozens of them. Falls back to the
 * full source when the map has no local file.
 */
export function getMapThumbSrc(
  map: Partial<MapRealm> | null | undefined,
  backendBase: string = DEFAULT_BACKEND_BASE
): string {
  const local = map?.photo_local_path || map?.callout_image_local_path;
  if (!local) return getMapImageSrc(map, backendBase);
  return getThumbUrl('maps', local, 320, backendBase || DEFAULT_BACKEND_BASE);
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

/** A map's variation number ("Preschool III", "Coal Tower II"), in the English name and in every translation. */
const MAP_VARIATION_SUFFIX_RE = /\s+(I|II|III|IV|V)$/;

type MapNameFields = Pick<MapRealm, 'name'> & Partial<Pick<MapRealm, 'raw_name'>>;

/** The numeral a map's name ends with, or null for a map without variations. Read from the English name. */
export function getMapVariationNumeral(map: MapNameFields): string | null {
  return (map.raw_name ?? map.name).match(MAP_VARIATION_SUFFIX_RE)?.[1] ?? null;
}

/** Variations after the first are no longer in the game; the first one is the map itself. */
export function isRemovedMapVariation(map: MapNameFields): boolean {
  const numeral = getMapVariationNumeral(map);
  return numeral !== null && numeral !== 'I';
}

/** The map's name without its variation numeral. */
export function stripMapVariationNumeral(name: string): string {
  return name.replace(MAP_VARIATION_SUFFIX_RE, '');
}

export type MapSizeBucket = 'small' | 'medium' | 'large';

/** Upper bounds (exclusive, in m²) for the small and medium size buckets. */
const MAP_SIZE_SMALL_MAX = 9000;
const MAP_SIZE_MEDIUM_MAX = 10000;

export function getMapSizeBucket(sizeSqMeters: number | null | undefined): MapSizeBucket | null {
  if (sizeSqMeters == null) return null;
  if (sizeSqMeters < MAP_SIZE_SMALL_MAX) return 'small';
  if (sizeSqMeters < MAP_SIZE_MEDIUM_MAX) return 'medium';
  return 'large';
}

/** `null` on a field means "any value". */
export interface MapAttributeFilters {
  layoutType: string | null;
  size: MapSizeBucket | null;
}

export const EMPTY_MAP_FILTERS: MapAttributeFilters = {
  layoutType: null,
  size: null,
};

export function hasActiveMapFilters(filters: MapAttributeFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

export function mapMatchesFilters(map: MapRealm, filters: MapAttributeFilters): boolean {
  if (filters.layoutType !== null && map.layout_type !== filters.layoutType) return false;
  if (filters.size !== null && getMapSizeBucket(map.size_sq_meters) !== filters.size) return false;
  return true;
}

/** Distinct layout types present in the data, alphabetically. */
export function getLayoutTypeOptions(maps: MapRealm[]): string[] {
  return [...new Set(maps.map((m) => m.layout_type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

type MapsDictionary = Dictionary['maps'];
type LabelEntry = readonly [keyof MapsDictionary, string];

// Raw database values mapped to their dictionary key and English fallback.
const LAYOUT_LABELS: Record<string, LabelEntry> = {
  Outdoor: ['layoutOutdoor', 'Outdoor'],
  Indoor: ['layoutIndoor', 'Indoor'],
  Hybrid: ['layoutHybrid', 'Hybrid'],
};

function translateValue(labels: Record<string, LabelEntry>, value: string, dict?: MapsDictionary): string {
  const entry = labels[value];
  return entry ? dict?.[entry[0]] || entry[1] : value;
}

/** Localized name of a map's layout type ("Outdoor" -> "Otwarty"). */
export function getLayoutTypeLabel(value: string, dict?: MapsDictionary): string {
  return translateValue(LAYOUT_LABELS, value, dict);
}

export type MapOpenVia = AnalyticsEvents['map_open']['via'];

/** `map_open` props: English names (readable in the dashboard, stable across site languages). */
export function mapOpenProps(
  map: Pick<MapRealm, 'id' | 'name' | 'realm'> & Partial<Pick<MapRealm, 'raw_name' | 'raw_realm'>>,
  via: MapOpenVia
): AnalyticsEvents['map_open'] {
  return { map: map.raw_name ?? map.name, map_id: map.id, realm: map.raw_realm ?? map.realm, via };
}
