// frontend/src/services/mapApi.ts
import { MapRealm, Realm } from '@/types/map';

const getApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:5000/api/v1';
  if (envUrl.includes('/api/v1')) return envUrl;
  return `${envUrl.replace(/\/$/, '')}/api/v1`;
};

const API_BASE = getApiBase();

export async function fetchMaps(realm?: string, search?: string, source?: string): Promise<{ maps: MapRealm[] }> {
  const params = new URLSearchParams();
  if (realm) params.append('realm', realm);
  if (search) params.append('search', search);
  if (source) params.append('source', source);

  const url = `${API_BASE}/maps?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch maps');
  return res.json();
}

export async function fetchRealms(): Promise<{ realms: Realm[] }> {
  const url = `${API_BASE}/maps/realms`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch realms');
  return res.json();
}
