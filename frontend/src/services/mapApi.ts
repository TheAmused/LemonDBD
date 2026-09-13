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
 *
 * `lang` is part of the key, not just the query string. The two windows are
 * independent -- a language switch has to miss the *client* cache as well, or
 * the previous locale's copy keeps being served from memory for the next half
 * hour without a request ever being made for the ETag to answer.
 */

/** Exported so callers can read the cache synchronously before rendering. */
export function mapsCacheKey(
  search?: string,
  source?: string,
  realm?: string,
  lang?: string
): string {
  return catalogKey('maps', { realm, search, source, lang });
}

export function realmsCacheKey(lang?: string): string {
  return catalogKey('maps/realms', { lang });
}

export async function fetchMaps(
  realm?: string,
  search?: string,
  source?: string,
  lang?: string
): Promise<{ maps: MapRealm[] }> {
  const url = mapsCacheKey(search, source, realm, lang);
  return fetchCached(url, () => fetchJson<{ maps: MapRealm[] }>(url), { ttlMs: CATALOG_TTL_MS });
}

export async function fetchRealms(lang?: string): Promise<{ realms: Realm[] }> {
  const url = realmsCacheKey(lang);
  return fetchCached(url, () => fetchJson<{ realms: Realm[] }>(url), { ttlMs: CATALOG_TTL_MS });
}
