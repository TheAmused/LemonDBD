// frontend/src/utils/tierLists/items.ts
/**
 * Catalog rows -> TierItem. One adapter per kind, all pure.
 *
 * Disabled rows (the admin kill switch) are dropped here, once, so no board
 * ever shows them. `itemIds` narrows a template to a subset of its catalog;
 * the order of the result is always the catalog's own order.
 */
import type { MapRealm } from '@/types/map';
import type { CharacterItem, Perk } from '@/types/perks';
import type { TierItem, TierListApiCustomItem, TierListDocumentItem } from '@/types/tierList';
import { getMapImageSrc, getMapThumbSrc } from '@/utils/mapUtils';
import { perkIconUrl } from '@/utils/staticUrl';
import { staticUrl } from '@/utils/api';
import { sanitizeImageUrl } from './codec';

type Role = 'Survivor' | 'Killer';

function subsetFilter(itemIds: readonly number[] | null | undefined) {
  if (!itemIds) return () => true;
  const allowed = new Set(itemIds);
  return (id: number | undefined) => id !== undefined && allowed.has(id);
}

const byName = (a: TierItem, b: TierItem) => a.name.localeCompare(b.name);

export function perksToItems(perks: readonly Perk[], role: Role, itemIds?: readonly number[] | null): TierItem[] {
  const inSubset = subsetFilter(itemIds);
  const seenKeys = new Set<string>();
  const items: TierItem[] = [];
  for (const p of perks) {
    if (p.id !== undefined && p.category === role && !p.is_disabled && inSubset(p.id)) {
      const key = `perk:${p.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        items.push({
          key,
          name: p.name,
          image: perkIconUrl(p) ?? null,
          subtitle: p.character && p.character !== 'General' ? p.character : undefined,
          description: p.description,
        });
      }
    }
  }
  return items.sort(byName);
}

export interface CatalogCharacter extends CharacterItem {
  role?: string;
  chapter_name?: string;
}

export function charactersToItems(
  characters: readonly CatalogCharacter[],
  role: Role,
  itemIds?: readonly number[] | null
): TierItem[] {
  const inSubset = subsetFilter(itemIds);
  const prefix = role === 'Survivor' ? 'survivor' : 'killer';
  const seenKeys = new Set<string>();
  const items: TierItem[] = [];
  for (const c of characters) {
    if (c.id !== undefined && (c.role ?? c.category) === role && !c.is_disabled && inSubset(c.id)) {
      const key = `${prefix}:${c.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        items.push({
          key,
          name: c.name,
          image: staticUrl(c.avatar_local_path) ?? (c.portrait_url || null),
          subtitle: c.chapter_name || undefined,
        });
      }
    }
  }
  return items;
}

export function mapsToItems(maps: readonly MapRealm[], itemIds?: readonly number[] | null): TierItem[] {
  const inSubset = subsetFilter(itemIds);
  const seenKeys = new Set<string>();
  const items: TierItem[] = [];
  for (const m of maps) {
    if (inSubset(m.id)) {
      const key = `map:${m.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        items.push({
          key,
          name: m.name,
          image: getMapThumbSrc(m) || null,
          fullImage: getMapImageSrc(m) || null,
          subtitle: m.realm || undefined,
        });
      }
    }
  }
  return items.sort((a, b) => (a.subtitle ?? '').localeCompare(b.subtitle ?? '') || a.name.localeCompare(b.name));
}

/** Items authored on an official `custom` template. */
export function templateCustomItemsToItems(items: readonly TierListApiCustomItem[]): TierItem[] {
  return items.map((item) => ({
    key: item.id,
    name: item.name,
    image: staticUrl(item.image_local_path) ?? sanitizeImageUrl(item.image_url),
  }));
}

/** Items of a user's own custom list (already sanitized when imported). */
export function documentItemsToItems(items: readonly TierListDocumentItem[]): TierItem[] {
  return items.map((item) => ({
    key: item.id,
    name: item.name,
    image: item.image ? (item.image.startsWith('/static/') ? staticUrl(item.image) ?? null : item.image) : null,
  }));
}
