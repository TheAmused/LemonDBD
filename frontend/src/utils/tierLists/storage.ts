// frontend/src/utils/tierLists/storage.ts
/**
 * Client-only persistence for tier lists: the user's ranking of each official
 * list, and their own custom lists. Nothing here ever reaches the backend.
 *
 * One localStorage key, one versioned document:
 *
 *   lemondbd_tier_lists = { version: 1, rankings: {<slug>: ...}, custom: {<id>: ...} }
 *
 * Device-wide rather than per account on purpose: the data never leaves the
 * browser, so scoping it by login would only make a guest's lists vanish the
 * moment they sign in.
 *
 * Reads go through a tiny external store (subscribe + cached snapshot), which
 * `useSyncExternalStore` consumes. That gives three things for free: a stable
 * server snapshot (no hydration mismatch), every mounted component seeing a
 * write immediately, and other tabs catching up through the `storage` event.
 *
 * Every access is guarded -- private mode, a sandboxed iframe or a full quota
 * degrade to "not saved", reported to the caller, never an exception.
 */
import type {
  StoredCustomList,
  StoredRanking,
  TierDefinition,
  TierListDocumentItem,
  TierListStoreState,
  TierPlacements,
} from '@/types/tierList';
import { createRandomId, createVersionedStore, isRecord, readNumber, type SaveResult } from '@/utils/versionedStore';
import { isTierColor, normalizePlacements, sanitizeImageUrl } from './codec';
import { ITEM_ID_PATTERN, TIER_LIST_LIMITS } from './constants';

export const TIER_LIST_STORAGE_KEY = 'lemondbd_tier_lists';
export const TIER_LIST_STORE_VERSION = 1 as const;

export type { SaveResult };

export const EMPTY_TIER_LIST_STATE: TierListStoreState = Object.freeze({
  version: TIER_LIST_STORE_VERSION,
  rankings: Object.freeze({}) as Record<string, StoredRanking>,
  custom: Object.freeze({}) as Record<string, StoredCustomList>,
}) as TierListStoreState;

// ---------------------------------------------------------------------------
// Parsing stored data defensively. localStorage is user-editable and survives
// app upgrades, so a stored value is treated as untrusted as any import.
// ---------------------------------------------------------------------------

function readTiers(raw: unknown): TierDefinition[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const tiers: TierDefinition[] = [];
  for (const t of raw.slice(0, TIER_LIST_LIMITS.maxTiers)) {
    if (!isRecord(t) || typeof t.id !== 'string' || typeof t.label !== 'string' || seen.has(t.id)) continue;
    seen.add(t.id);
    const backgroundImage = sanitizeImageUrl(t.backgroundImage);
    tiers.push({
      id: t.id,
      label: t.label.slice(0, TIER_LIST_LIMITS.maxTierLabel),
      color: isTierColor(t.color) ? t.color : 'neutral',
      ...(backgroundImage ? { backgroundImage } : {}),
    });
  }
  return tiers.length ? tiers : null;
}

function readPlacements(raw: unknown): TierPlacements {
  if (!isRecord(raw)) return {};
  const out: TierPlacements = {};
  for (const [tierId, keys] of Object.entries(raw)) {
    if (Array.isArray(keys)) out[tierId] = keys.filter((k): k is string => typeof k === 'string');
  }
  return out;
}

function readItems(raw: unknown): TierListDocumentItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TierListDocumentItem[] = [];
  for (const item of raw.slice(0, TIER_LIST_LIMITS.maxItems)) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    if (!ITEM_ID_PATTERN.test(item.id)) continue;
    const image = sanitizeImageUrl(item.image);
    items.push(image ? { id: item.id, name: item.name, image } : { id: item.id, name: item.name });
  }
  return items;
}

/**
 * Upgrades any stored shape to the current one. Version 1 is the first; a
 * future v2 adds a branch here instead of breaking everyone's saved lists.
 */
export function migrateTierListState(raw: unknown): TierListStoreState {
  if (!isRecord(raw)) return { version: TIER_LIST_STORE_VERSION, rankings: {}, custom: {} };

  const rankings: Record<string, StoredRanking> = {};
  if (isRecord(raw.rankings)) {
    for (const [slug, value] of Object.entries(raw.rankings)) {
      if (!isRecord(value)) continue;
      rankings[slug] = {
        tiers: readTiers(value.tiers),
        placements: readPlacements(value.placements),
        updatedAt: readNumber(value.updatedAt, 0),
      };
    }
  }

  const custom: Record<string, StoredCustomList> = {};
  if (isRecord(raw.custom)) {
    for (const [id, value] of Object.entries(raw.custom)) {
      if (!isRecord(value)) continue;
      const tiers = readTiers(value.tiers);
      // A list with no items yet is legitimate -- "New custom list" starts empty.
      if (!tiers) continue;
      const items = readItems(value.items);
      const itemIds = new Set(items.map((i) => i.id));
      const backgroundImage = sanitizeImageUrl(value.backgroundImage);
      custom[id] = {
        id,
        title: typeof value.title === 'string' ? value.title : '',
        description: typeof value.description === 'string' ? value.description : '',
        tiers,
        items,
        placements: normalizePlacements(value.placements, tiers.map((t) => t.id), (k) => itemIds.has(k)).placements,
        createdAt: readNumber(value.createdAt, 0),
        updatedAt: readNumber(value.updatedAt, 0),
        ...(backgroundImage ? { backgroundImage } : {}),
      };
    }
  }

  return { version: TIER_LIST_STORE_VERSION, rankings, custom };
}

const store = createVersionedStore<TierListStoreState>({
  key: TIER_LIST_STORAGE_KEY,
  empty: EMPTY_TIER_LIST_STATE,
  migrate: migrateTierListState,
});

export const loadTierListState = store.load;
export const saveTierListState = store.save;
export const subscribeTierListStore = store.subscribe;
/** Cached: `useSyncExternalStore` requires the same object until something changes. */
export const getTierListSnapshot = store.getSnapshot;
export const getTierListServerSnapshot = store.getServerSnapshot;
/** Applies `mutate` to the current state, persists it, and notifies subscribers. */
export const updateTierListState = store.update;
/** Test hook: forget the cached snapshot so the next read hits storage. */
export const resetTierListStoreCache = store.resetCache;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function saveRanking(slug: string, ranking: Omit<StoredRanking, 'updatedAt'>): SaveResult {
  return updateTierListState((state) => ({
    ...state,
    rankings: { ...state.rankings, [slug]: { ...ranking, updatedAt: Date.now() } },
  }));
}

export function clearRanking(slug: string): SaveResult {
  return updateTierListState((state) => {
    if (!(slug in state.rankings)) return state;
    const rankings = { ...state.rankings };
    delete rankings[slug];
    return { ...state, rankings };
  });
}

export function saveCustomList(list: Omit<StoredCustomList, 'updatedAt'>): SaveResult {
  return updateTierListState((state) => ({
    ...state,
    custom: { ...state.custom, [list.id]: { ...list, updatedAt: Date.now() } },
  }));
}

export function deleteCustomList(id: string): SaveResult {
  return updateTierListState((state) => {
    if (!(id in state.custom)) return state;
    const custom = { ...state.custom };
    delete custom[id];
    return { ...state, custom };
  });
}

/** A short random id for a new custom list (`/tier-lists/custom/<id>`). */
export const createCustomListId = createRandomId;
