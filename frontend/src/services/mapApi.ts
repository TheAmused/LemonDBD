// frontend/src/services/mapApi.ts
import { MapRealm, Realm } from '@/types/map';
import { CATALOG_TTL_MS, catalogKey, fetchCached, fetchJson } from '@/services/dataCache';

/*
 * Map data is static between patches, and the explorer re-requested all of it
 * every time the page mounted. Routing these reads through the shared cache
 * makes a return visit instant, while concurrent callers collapse onto a
 * single request.
 *
 * Both reads use the catalog window rather than the default one: /maps is one
 * of the endpoints the backend now ETags, so the rare request that does escape
 * the window comes back as a 304 rather than the full realm payload.
 */

/** Exported so callers can read the cache synchronously before rendering. */
export function mapsCacheKey(search?: string, source?: string, realm?: string): string {
  return catalogKey('maps', { realm, search, source });
}

export function realmsCacheKey(): string {
  return catalogKey('maps/realms');
}

export async function fetchMaps(realm?: string, search?: string, source?: string): Promise<{ maps: MapRealm[] }> {
  const url = mapsCacheKey(search, source, realm);
  return fetchCached(url, () => fetchJson<{ maps: MapRealm[] }>(url), { ttlMs: CATALOG_TTL_MS });
}

export async function fetchRealms(): Promise<{ realms: Realm[] }> {
  const url = realmsCacheKey();
  return fetchCached(url, () => fetchJson<{ realms: Realm[] }>(url), { ttlMs: CATALOG_TTL_MS });
}
