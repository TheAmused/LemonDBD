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
import { createRandomId, createVersionedStore, isRecord, readNumber, type SaveResult } from '@/utils/versionedStore';
import { sanitizeImageUrl } from './codec';
import { ENTITY_ID_PATTERN, SMASH_ROSTER_LIMITS } from './constants';

export const SMASH_ROSTER_STORAGE_KEY = 'lemondbd_smash_rosters';
export const SMASH_ROSTER_STORE_VERSION = 1 as const;

export type { SaveResult };

export const EMPTY_SMASH_ROSTER_STATE: SmashRosterStoreState = Object.freeze({
  version: SMASH_ROSTER_STORE_VERSION,
  custom: Object.freeze({}) as Record<string, StoredCustomRoster>,
}) as SmashRosterStoreState;

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
        ...(value.roster_mode === 'simple' ? { roster_mode: 'simple' as const } : { roster_mode: 'full' as const }),
        ...(Array.isArray(value.custom_roles) ? { custom_roles: value.custom_roles as string[] } : {}),
        ...(Array.isArray(value.custom_genders) ? { custom_genders: value.custom_genders as string[] } : {}),
        ...(isRecord(value.custom_labels) ? { custom_labels: value.custom_labels as any } : {}),
        ...(Array.isArray(value.romance_archetypes) ? { romance_archetypes: value.romance_archetypes as any } : {}),
      };
    }
  }

  return { version: SMASH_ROSTER_STORE_VERSION, custom };
}

const store = createVersionedStore<SmashRosterStoreState>({
  key: SMASH_ROSTER_STORAGE_KEY,
  empty: EMPTY_SMASH_ROSTER_STATE,
  migrate: migrateSmashRosterState,
});

export const loadSmashRosterState = store.load;
export const saveSmashRosterState = store.save;
export const subscribeSmashRosterStore = store.subscribe;
/** Cached: `useSyncExternalStore` requires the same object until something changes. */
export const getSmashRosterSnapshot = store.getSnapshot;
export const getSmashRosterServerSnapshot = store.getServerSnapshot;
/** Applies `mutate` to the current state, persists it, and notifies subscribers. */
export const updateSmashRosterState = store.update;

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
export const createCustomRosterId = createRandomId;
