// frontend/src/services/tierListApi.ts
import type { TierDefinition, TierListSummary, TierListTemplate, TierPlacements } from '@/types/tierList';
import { catalogKey, invalidate, writeCache } from '@/services/dataCache';
import { apiUrl, authFetch } from '@/utils/api';

/*
 * Official tier lists are seed content, served by `@cache_catalog` endpoints
 * that ETag on the catalog generation -- so they ride the same long client
 * window as perks and maps. `lang` is part of the key: a language switch must
 * miss the client cache too, or the previous locale's titles would be served
 * from memory for the next half hour.
 *
 * The cache always holds the raw response body under the request URL, whether
 * it was filled by these helpers or by `useCachedData` -- one shape per key,
 * so either path can read what the other wrote.
 */

export interface TierListsResponse {
  count: number;
  data: TierListSummary[];
}

export interface TierListResponse {
  data: TierListTemplate;
}

export function tierListsCacheKey(lang: string): string {
  return catalogKey('tier-lists', { lang });
}

export function tierListCacheKey(slug: string, lang: string): string {
  return catalogKey(`tier-lists/${encodeURIComponent(slug)}`, { lang });
}

/** True when a `fetchJson` rejection was a 404 rather than a network or server failure. */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /\(404\)/.test(error.message);
}

export interface OfficialTierListUpdatePayload {
  title?: string;
  description?: string;
  cover_image_url?: string | null;
  tiers?: TierDefinition[];
  items?: Array<{ id: string; name: string; image_url?: string }>;
  default_placements?: TierPlacements | null;
}

export async function updateOfficialTierList(
  slug: string,
  payload: OfficialTierListUpdatePayload,
  lang: string,
  token?: string | null
): Promise<TierListTemplate> {
  const res = await authFetch(apiUrl(`/api/v1/tier-lists/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`), {
    method: 'PUT',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  const body = (await res.json()) as { data: TierListTemplate };
  writeCache<TierListResponse>(tierListCacheKey(slug, lang), { data: body.data });
  invalidate(catalogKey('tier-lists'));
  return body.data;
}

export interface OfficialTierListCreatePayload {
  title: string;
  description?: string;
  cover_image_url?: string | null;
  tiers: TierDefinition[];
  items: Array<{ id: string; name: string; image_url?: string }>;
}

export async function createOfficialTierList(
  payload: OfficialTierListCreatePayload,
  lang: string,
  token?: string | null
): Promise<TierListTemplate> {
  const res = await authFetch(apiUrl(`/api/v1/tier-lists?lang=${encodeURIComponent(lang)}`), {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  const body = (await res.json()) as { data: TierListTemplate };
  writeCache<TierListResponse>(tierListCacheKey(body.data.slug, lang), { data: body.data });
  invalidate(catalogKey('tier-lists'));
  return body.data;
}

