import { MapRealm } from '@/types/map';

const getApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:5000/api/v1';
  if (envUrl.includes('/api/v1')) return envUrl;
  return `${envUrl.replace(/\/$/, '')}/api/v1`;
};

const API_BASE = getApiBase();

export async function fetchMaps(realm?: string, search?: string): Promise<{ maps: MapRealm[] }> {
  const params = new URLSearchParams();
  if (realm) params.append('realm', realm);
  if (search) params.append('search', search);

  const url = `${API_BASE}/maps?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch maps');
  return res.json();
}

export async function fetchMapDetail(
  mapId: string,
  seed?: string,
  floor?: number
): Promise<{ map: MapRealm }> {
  const params = new URLSearchParams();
  if (seed) params.append('seed', seed);
  if (floor !== undefined) params.append('floor', floor.toString());

  const queryString = params.toString();
  const url = `${API_BASE}/maps/${mapId}${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch map detail');
  return res.json();
}
