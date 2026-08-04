import { MapRealm } from '@/types/map';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function fetchMaps(realm?: string, search?: string): Promise<{ maps: MapRealm[] }> {
  const params = new URLSearchParams();
  if (realm) params.append('realm', realm);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/maps?${params.toString()}`);
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
