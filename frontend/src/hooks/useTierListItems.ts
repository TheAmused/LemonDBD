// frontend/src/hooks/useTierListItems.ts
'use client';

import { useMemo } from 'react';
import { useCachedData } from '@/hooks/useCachedData';
import { CATALOG_TTL_MS, catalogKey, fetchJson } from '@/services/dataCache';
import { mapsCacheKey } from '@/services/mapApi';
import type { MapRealm } from '@/types/map';
import type { Perk } from '@/types/perks';
import type { TierItem, TierListKind, TierListTemplate } from '@/types/tierList';
import { TIER_LIST_MAP_SOURCE } from '@/utils/tierLists/constants';
import {
  type CatalogCharacter,
  charactersToItems,
  mapsToItems,
  perksToItems,
  templateCustomItemsToItems,
} from '@/utils/tierLists/items';

type CatalogSource = 'perks' | 'characters' | 'maps' | null;

function sourceFor(kind: TierListKind | undefined): CatalogSource {
  switch (kind) {
    case 'survivor_perks':
    case 'killer_perks':
      return 'perks';
    case 'survivors':
    case 'killers':
      return 'characters';
    case 'maps':
      return 'maps';
    default:
      return null;
  }
}

/**
 * The exact cache keys other pages already use, so a tier list opened after
 * /perks, /characters or /maps (or the profile showcase) renders from memory
 * with no request at all, and vice versa:
 *   perks      -> `perks?lang=&limit=1000`  (user/MainCard)
 *   characters -> `characters?lang=`        (CharactersHub, character detail)
 *   maps       -> `maps?lang=&source=hens333` (MapExplorer)
 */
function keyFor(source: CatalogSource, lang: string): string | null {
  switch (source) {
    case 'perks':
      return catalogKey('perks', { limit: 1000, lang });
    case 'characters':
      return catalogKey('characters', { lang });
    case 'maps':
      return mapsCacheKey('', TIER_LIST_MAP_SOURCE, undefined, lang);
    default:
      return null;
  }
}

type CatalogPayload =
  | { data?: Perk[] }
  | Perk[]
  | { data?: CatalogCharacter[] }
  | { maps?: MapRealm[] };

export interface TierListItemsResult {
  items: TierItem[];
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

/** The parts of a template that decide what gets ranked -- an official template, or an ad-hoc one (the creator's catalog picker). */
export type TierListItemSource = Pick<TierListTemplate, 'kind' | 'item_ids' | 'custom_items'>;

/** Resolves a template to the items it ranks, through the shared catalog cache. */
export function useTierListItems(template: TierListItemSource | null | undefined, lang: string): TierListItemsResult {
  const source = sourceFor(template?.kind);
  const key = keyFor(source, lang);

  const { data, loading, error, refresh } = useCachedData<CatalogPayload>(
    key,
    () => fetchJson<CatalogPayload>(key as string),
    { ttlMs: CATALOG_TTL_MS }
  );

  const items = useMemo<TierItem[]>(() => {
    if (!template) return [];
    if (template.kind === 'custom') return templateCustomItemsToItems(template.custom_items ?? []);
    if (!data) return [];

    const ids = template.item_ids;
    if (source === 'perks') {
      const perks = (Array.isArray(data) ? data : ((data as { data?: Perk[] }).data ?? [])) as Perk[];
      return perksToItems(perks, template.kind === 'killer_perks' ? 'Killer' : 'Survivor', ids);
    }
    if (source === 'characters') {
      const chars = (data as { data?: CatalogCharacter[] }).data ?? [];
      return charactersToItems(chars, template.kind === 'killers' ? 'Killer' : 'Survivor', ids);
    }
    if (source === 'maps') {
      return mapsToItems((data as { maps?: MapRealm[] }).maps ?? [], ids);
    }
    return [];
  }, [template, data, source]);

  return {
    items,
    loading: template?.kind === 'custom' ? false : loading,
    error,
    refresh,
  };
}
