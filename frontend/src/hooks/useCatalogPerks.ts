// frontend/src/hooks/useCatalogPerks.ts
'use client';

import { useMemo, useState } from 'react';
import type { Perk } from '@/types/perks';
import { useCachedData } from '@/hooks/useCachedData';
import { CATALOG_TTL_MS, catalogKey, fetchJson, unwrapList, type ListPayload } from '@/services/dataCache';
import { useOnValueChange } from '@/hooks/useOnValueChange';

/**
 * The whole perk catalog through the shared cache. The key is the one /perks, the
 * tier lists and the profile showcase already use, so whichever of them is
 * opened first pays for the download and the rest paint from memory.
 *
 * A locale switch keeps showing the previous language's perks until the new
 * catalog arrives, and a failed first load ends as an empty list rather than an
 * endless loading state.
 */
export function useCatalogPerks(locale: string, enabled = true): { perks: Perk[]; loading: boolean } {
  const key = catalogKey('perks', { limit: 1000, lang: locale });
  const { data, loading, error } = useCachedData<ListPayload<Perk>>(key, () => fetchJson<ListPayload<Perk>>(key), {
    ttlMs: CATALOG_TTL_MS,
    enabled,
  });
  const loaded = useMemo(() => (data === undefined ? undefined : unwrapList(data)), [data]);

  // The last list that arrived stays on screen while another locale's loads.
  const [lastLoaded, setLastLoaded] = useState<Perk[]>(() => loaded ?? []);
  useOnValueChange(loaded, (next) => {
    if (next) setLastLoaded(next);
  });
  const perks = loaded ?? lastLoaded;

  return { perks, loading: loading && !error && perks.length === 0 };
}
