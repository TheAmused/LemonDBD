// frontend/src/services/mapApi.ts
import { MapRealm, Realm } from '@/types/map';
import { fetchCached, fetchJson } from '@/services/dataCache';
import { getBackendBaseUrl } from '@/utils/perkUtils';

/*
 * Map data is static between patches, and the explorer re-requested all of it
 * every time the page mounted. Routing these reads through the shared cache
 * makes a return visit instant, while concurrent callers collapse onto a
 * single request.
 */

const getApiBase = () => {
  const base = getBackendBaseUrl();
  return base ? `${base}/api/v1` : '/api/v1';
};

const API_BASE = getApiBase();

/**
 * Exported so callers can read the cache synchronously before rendering.
 *
 * `lang` must be part of the key: the backend translates map/realm names from
 * the request's `lang` param (falling back to sniffing the Referer), so a
 * cache entry fetched under one locale is wrong for another. Without `lang`
 * here, switching the site language while staying on the page would keep
 * serving the previous locale's names out of this cache until a hard reload
 * reset it.
 */
export function mapsCacheKey(search?: string, source?: string, realm?: string, lang?: string): string {
  const params = new URLSearchParams();
  if (realm) params.append('realm', realm);
  if (search) params.append('search', search);
  if (source) params.append('source', source);
  if (lang) params.append('lang', lang);
  return `${API_BASE}/maps?${params.toString()}`;
}

export function realmsCacheKey(lang?: string): string {
  const params = new URLSearchParams();
  if (lang) params.append('lang', lang);
  const query = params.toString();
  return `${API_BASE}/maps/realms${query ? `?${query}` : ''}`;
}

export async function fetchMaps(
  realm?: string,
  search?: string,
  source?: string,
  lang?: string
): Promise<{ maps: MapRealm[] }> {
  const url = mapsCacheKey(search, source, realm, lang);
  return fetchCached(url, () => fetchJson<{ maps: MapRealm[] }>(url));
}

export async function fetchRealms(lang?: string): Promise<{ realms: Realm[] }> {
  const url = realmsCacheKey(lang);
  return fetchCached(url, () => fetchJson<{ realms: Realm[] }>(url));
}
