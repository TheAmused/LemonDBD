// frontend/src/hooks/useTierListTemplates.ts
'use client';

import { useCachedData } from '@/hooks/useCachedData';
import { CATALOG_TTL_MS, fetchJson } from '@/services/dataCache';
import {
  type TierListResponse,
  type TierListsResponse,
  tierListCacheKey,
  tierListsCacheKey,
} from '@/services/tierListApi';

/** Official tier-list summaries for the hub. Warm cache renders on the first frame. */
export function useTierListSummaries(lang: string) {
  const key = tierListsCacheKey(lang);
  const result = useCachedData<TierListsResponse>(key, () => fetchJson<TierListsResponse>(key), {
    ttlMs: CATALOG_TTL_MS,
  });
  return { ...result, lists: result.data?.data ?? [] };
}

/** One official template by slug (`null` slug skips the request). */
export function useTierListTemplate(slug: string | null, lang: string) {
  const key = slug ? tierListCacheKey(slug, lang) : null;
  const result = useCachedData<TierListResponse>(key, () => fetchJson<TierListResponse>(key as string), {
    ttlMs: CATALOG_TTL_MS,
  });
  return { ...result, template: result.data?.data ?? null };
}
