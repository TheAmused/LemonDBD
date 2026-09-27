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
import { isTierColor, normalizePlacements, sanitizeImageUrl } from './codec';
import { ITEM_ID_PATTERN, TIER_LIST_LIMITS } from './constants';

export const TIER_LIST_STORAGE_KEY = 'lemondbd_tier_lists';
export const TIER_LIST_STORE_VERSION = 1 as const;

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export const EMPTY_TIER_LIST_STATE: TierListStoreState = Object.freeze({
  version: TIER_LIST_STORE_VERSION,
  rankings: Object.freeze({}) as Record<string, StoredRanking>,
  custom: Object.freeze({}) as Record<string, StoredCustomList>,
}) as TierListStoreState;

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
    tiers.push({ id: t.id, label: t.label.slice(0, TIER_LIST_LIMITS.maxTierLabel), color: isTierColor(t.color) ? t.color : 'neutral' });
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

function readNumber(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
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
      custom[id] = {
        id,
        title: typeof value.title === 'string' ? value.title : '',
        description: typeof value.description === 'string' ? value.description : '',
        tiers,
        items,
        placements: normalizePlacements(value.placements, tiers.map((t) => t.id), (k) => itemIds.has(k)).placements,
        createdAt: readNumber(value.createdAt, 0),
        updatedAt: readNumber(value.updatedAt, 0),
      };
    }
  }

  return { version: TIER_LIST_STORE_VERSION, rankings, custom };
}

export function loadTierListState(storage: Storage | null = getStorage()): TierListStoreState {
  if (!storage) return EMPTY_TIER_LIST_STATE;
  try {
    const raw = storage.getItem(TIER_LIST_STORAGE_KEY);
    if (!raw) return EMPTY_TIER_LIST_STATE;
    return migrateTierListState(JSON.parse(raw));
  } catch {
    // Corrupt JSON: start empty rather than crash the page. The bad value is
    // left in place until the next successful save overwrites it.
    return EMPTY_TIER_LIST_STATE;
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(err.message))
  );
}

export function saveTierListState(state: TierListStoreState, storage: Storage | null = getStorage()): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(TIER_LIST_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: isQuotaError(err) ? 'quota' : 'unavailable' };
  }
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
let snapshot: TierListStoreState | null = null;
let storageListenerAttached = false;

function emit(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // One broken subscriber must not stop the rest.
    }
  });
}

function onStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== TIER_LIST_STORAGE_KEY) return;
  snapshot = null; // another tab wrote -- re-read lazily
  emit();
}

export function subscribeTierListStore(cb: () => void): () => void {
  listeners.add(cb);
  if (!storageListenerAttached && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorageEvent);
    storageListenerAttached = true;
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && storageListenerAttached && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorageEvent);
      storageListenerAttached = false;
    }
  };
}

/** Cached: `useSyncExternalStore` requires the same object until something changes. */
export function getTierListSnapshot(): TierListStoreState {
  if (snapshot === null) snapshot = loadTierListState();
  return snapshot;
}

export function getTierListServerSnapshot(): TierListStoreState {
  return EMPTY_TIER_LIST_STATE;
}

/** Applies `mutate` to the current state, persists it, and notifies subscribers. */
export function updateTierListState(
  mutate: (state: TierListStoreState) => TierListStoreState
): SaveResult {
  const next = mutate(getTierListSnapshot());
  const result = saveTierListState(next);
  // Keep the in-memory copy even when saving failed, so the board the user is
  // looking at does not jump back; the caller surfaces the "not saved" notice.
  snapshot = next;
  emit();
  return result;
}

/** Test hook: forget the cached snapshot so the next read hits storage. */
export function resetTierListStoreCache(): void {
  snapshot = null;
}

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
export function createCustomListId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}
