// frontend/src/services/tierListApi.ts
import type { TierListSummary, TierListTemplate } from '@/types/tierList';
import { catalogKey } from '@/services/dataCache';

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
