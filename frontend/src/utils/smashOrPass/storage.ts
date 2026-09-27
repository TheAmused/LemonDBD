// frontend/src/utils/smashOrPass/storage.ts
/**
 * Client-only persistence for a user's own smash-or-pass rosters. Nothing
 * here ever reaches the backend -- an admin's official roster is the only
 * kind that lives server-side (see `smash_or_pass_service.create_roster`).
 *
 * One localStorage key, one versioned document:
 *
 *   lemondbd_smash_rosters = { version: 1, custom: {<id>: ...} }
 *
 * There is no `rankings` counterpart the way tier lists have one: a custom
 * roster is always self-contained (its own entities), and votes on ANY
 * roster -- official or custom -- are ephemeral, client-side-only session
 * state for a local roster (there is no server session id for a roster the
 * backend has never heard of), so there is nothing durable to key by slug
 * here beyond the roster document itself.
 *
 * Device-wide rather than per account on purpose: the data never leaves the
 * browser, so scoping it by login would only make a guest's rosters vanish
 * the moment they sign in.
 *
 * Reads go through a tiny external store (subscribe + cached snapshot), which
 * `useSyncExternalStore` consumes. That gives three things for free: a stable
 * server snapshot (no hydration mismatch), every mounted component seeing a
 * write immediately, and other tabs catching up through the `storage` event.
 *
 * Every access is guarded -- private mode, a sandboxed iframe or a full quota
 * degrade to "not saved", reported to the caller, never an exception.
 */
import {
  SMASH_ROSTER_FORMAT,
  SMASH_ROSTER_FORMAT_VERSION,
  type SmashRosterDocumentEntity,
  type SmashRosterStoreState,
  type StoredCustomRoster,
} from '@/types/smashOrPass';
import { sanitizeImageUrl } from './codec';
import { ENTITY_ID_PATTERN, SMASH_ROSTER_LIMITS } from './constants';

export const SMASH_ROSTER_STORAGE_KEY = 'lemondbd_smash_rosters';
export const SMASH_ROSTER_STORE_VERSION = 1 as const;

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export const EMPTY_SMASH_ROSTER_STATE: SmashRosterStoreState = Object.freeze({
  version: SMASH_ROSTER_STORE_VERSION,
  custom: Object.freeze({}) as Record<string, StoredCustomRoster>,
}) as SmashRosterStoreState;

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

function readNumber(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

// ---------------------------------------------------------------------------
// Parsing stored data defensively. localStorage is user-editable and survives
// app upgrades, so a stored value is treated as untrusted as any import.
// ---------------------------------------------------------------------------

function readEntities(raw: unknown): SmashRosterDocumentEntity[] {
  if (!Array.isArray(raw)) return [];
  const entities: SmashRosterDocumentEntity[] = [];
  const seen = new Set<string>();
  for (const e of raw.slice(0, SMASH_ROSTER_LIMITS.maxEntities)) {
    if (!isRecord(e) || typeof e.id !== 'string' || typeof e.name !== 'string') continue;
    if (!ENTITY_ID_PATTERN.test(e.id) || seen.has(e.id)) continue;
    seen.add(e.id);
    const entity: SmashRosterDocumentEntity = {
      id: e.id,
      name: e.name.slice(0, SMASH_ROSTER_LIMITS.maxEntityName),
      role: typeof e.role === 'string' && e.role ? e.role : 'Survivor',
      gender: typeof e.gender === 'string' && e.gender ? e.gender : 'female',
    };
    const media_url = sanitizeImageUrl(e.media_url);
    if (media_url) entity.media_url = media_url;
    for (const field of [
      'media_type', 'real_name', 'watermark_left', 'watermark_right', 'archetype',
      'bio', 'tagline', 'quote', 'meme', 'turn_on', 'dealbreaker', 'dating_vibe',
      'chapter', 'danger_level',
    ] as const) {
      const value = e[field];
      if (typeof value === 'string' && value) (entity as unknown as Record<string, unknown>)[field] = value;
    }
    for (const field of ['red_flags', 'green_flags'] as const) {
      const value = e[field];
      if (Array.isArray(value)) {
        const flags = value.filter((v): v is string => typeof v === 'string').slice(0, SMASH_ROSTER_LIMITS.maxFlags);
        if (flags.length) entity[field] = flags;
      }
    }
    if (typeof e.chaos_score === 'number' && Number.isFinite(e.chaos_score)) {
      entity.chaos_score = Math.round(Math.min(100, Math.max(0, e.chaos_score)));
    }
    entities.push(entity);
  }
  return entities;
}

/**
 * Upgrades any stored shape to the current one. Version 1 is the first; a
 * future v2 adds a branch here instead of breaking everyone's saved rosters.
 */
export function migrateSmashRosterState(raw: unknown): SmashRosterStoreState {
  if (!isRecord(raw)) return { version: SMASH_ROSTER_STORE_VERSION, custom: {} };

  const custom: Record<string, StoredCustomRoster> = {};
  if (isRecord(raw.custom)) {
    for (const [id, value] of Object.entries(raw.custom)) {
      if (!isRecord(value)) continue;
      const entities = readEntities(value.entities);
      // A roster with no entities yet is legitimate -- "New roster" starts empty.
      const cover_image_url = sanitizeImageUrl(value.cover_image_url);
      custom[id] = {
        id,
        format: SMASH_ROSTER_FORMAT,
        version: SMASH_ROSTER_FORMAT_VERSION,
        name: typeof value.name === 'string' ? value.name : '',
        description: typeof value.description === 'string' ? value.description : '',
        entities,
        createdAt: readNumber(value.createdAt, 0),
        updatedAt: readNumber(value.updatedAt, 0),
        ...(cover_image_url ? { cover_image_url } : {}),
        ...(typeof value.theme_color === 'string' && value.theme_color ? { theme_color: value.theme_color } : {}),
        ...(typeof value.category === 'string' && value.category ? { category: value.category } : {}),
        ...(value.is_nsfw === true ? { is_nsfw: true } : {}),
      };
    }
  }

  return { version: SMASH_ROSTER_STORE_VERSION, custom };
}

export function loadSmashRosterState(storage: Storage | null = getStorage()): SmashRosterStoreState {
  if (!storage) return EMPTY_SMASH_ROSTER_STATE;
  try {
    const raw = storage.getItem(SMASH_ROSTER_STORAGE_KEY);
    if (!raw) return EMPTY_SMASH_ROSTER_STATE;
    return migrateSmashRosterState(JSON.parse(raw));
  } catch {
    // Corrupt JSON: start empty rather than crash the page. The bad value is
    // left in place until the next successful save overwrites it.
    return EMPTY_SMASH_ROSTER_STATE;
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(err.message))
  );
}

export function saveSmashRosterState(
  state: SmashRosterStoreState,
  storage: Storage | null = getStorage()
): SaveResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(SMASH_ROSTER_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: isQuotaError(err) ? 'quota' : 'unavailable' };
  }
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
let snapshot: SmashRosterStoreState | null = null;
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
  if (event.key !== null && event.key !== SMASH_ROSTER_STORAGE_KEY) return;
  snapshot = null; // another tab wrote -- re-read lazily
  emit();
}

export function subscribeSmashRosterStore(cb: () => void): () => void {
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
export function getSmashRosterSnapshot(): SmashRosterStoreState {
  if (snapshot === null) snapshot = loadSmashRosterState();
  return snapshot;
}

export function getSmashRosterServerSnapshot(): SmashRosterStoreState {
  return EMPTY_SMASH_ROSTER_STATE;
}

/** Applies `mutate` to the current state, persists it, and notifies subscribers. */
export function updateSmashRosterState(
  mutate: (state: SmashRosterStoreState) => SmashRosterStoreState
): SaveResult {
  const next = mutate(getSmashRosterSnapshot());
  const result = saveSmashRosterState(next);
  // Keep the in-memory copy even when saving failed, so the roster the user
  // is looking at does not jump back; the caller surfaces the "not saved" notice.
  snapshot = next;
  emit();
  return result;
}

/** Test hook: forget the cached snapshot so the next read hits storage. */
export function resetSmashRosterStoreCache(): void {
  snapshot = null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function saveCustomRoster(roster: Omit<StoredCustomRoster, 'updatedAt'>): SaveResult {
  return updateSmashRosterState((state) => ({
    ...state,
    custom: { ...state.custom, [roster.id]: { ...roster, updatedAt: Date.now() } },
  }));
}

export function deleteCustomRoster(id: string): SaveResult {
  return updateSmashRosterState((state) => {
    if (!(id in state.custom)) return state;
    const custom = { ...state.custom };
    delete custom[id];
    return { ...state, custom };
  });
}

/** A short random id for a new custom roster. */
export function createCustomRosterId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}
