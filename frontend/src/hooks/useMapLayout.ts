'use client';
// frontend/src/hooks/useMapLayout.ts
import type { MapLayout, MapRealm } from '@/types/map';
import { CATALOG_TTL_MS } from '@/services/dataCache';
import { fetchMapLayout, mapLayoutCacheKey } from '@/services/mapApi';
import { useCachedData } from '@/hooks/useCachedData';

/**
 * The to-scale layout of a map, for what the picture shows (landmark codes, off-limits areas). The map list
 * does not carry it: a map that already has `layout` uses that, any other is asked for once and cached.
 * Undefined while it loads and for a map that has none.
 */
export function useMapLayout(map: MapRealm | null): MapLayout | undefined {
  const own = map?.layout ?? undefined;
  const mapId = map?.id ?? 0;
  const { data } = useCachedData(map && !own ? mapLayoutCacheKey(mapId) : null, () => fetchMapLayout(mapId), {
    ttlMs: CATALOG_TTL_MS,
  });
  return own ?? data?.layout ?? undefined;
}
