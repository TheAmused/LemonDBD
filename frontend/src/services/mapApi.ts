// frontend/src/services/mapApi.ts
import { MapRealm, Realm } from '@/types/map';
import { fetchCached, fetchJson } from '@/services/dataCache';

/*
 * Map data is static between patches, and the explorer re-requested all of it
 * every time the page mounted. Routing these reads through the shared cache
 * makes a return visit instant, while concurrent callers collapse onto a
 * single request.
 */

const getApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:5000/api/v1';
  if (envUrl.includes('/api/v1')) return envUrl;
  return `${envUrl.replace(/\/$/, '')}/api/v1`;
};

const API_BASE = getApiBase();

/** Exported so callers can read the cache synchronously before rendering. */
export function mapsCacheKey(search?: string, source?: string, realm?: string): string {
  const params = new URLSearchParams();
  if (realm) params.append('realm', realm);
  if (search) params.append('search', search);
  if (source) params.append('source', source);
  return `${API_BASE}/maps?${params.toString()}`;
}

export function realmsCacheKey(): string {
  return `${API_BASE}/maps/realms`;
}

export async function fetchMaps(realm?: string, search?: string, source?: string): Promise<{ maps: MapRealm[] }> {
  const url = mapsCacheKey(search, source, realm);
  return fetchCached(url, () => fetchJson<{ maps: MapRealm[] }>(url));
}

export async function fetchRealms(): Promise<{ realms: Realm[] }> {
  const url = realmsCacheKey();
  return fetchCached(url, () => fetchJson<{ realms: Realm[] }>(url));
}
