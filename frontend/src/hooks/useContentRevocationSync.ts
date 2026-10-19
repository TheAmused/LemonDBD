'use client';
// frontend/src/hooks/useContentRevocationSync.ts
/**
 * Keeps moderation bans in force on content that only lives in this browser.
 *
 * Custom tier lists, smash rosters and minigames are stored in localStorage and nowhere else. When a
 * moderator bans one, its content hash goes on the server's revocation list. This sweep hashes every
 * saved copy the way the server does (`utils/contentHash`), asks which hashes are revoked and deletes
 * those copies. The hash comes from the content itself, so unsigned copies and copies whose author
 * stamp was stripped are caught too.
 *
 * What counts as the same content: ranking a tier list (or voting, or playing) is using it, so every
 * ranking of a banned list is still the banned list. Saving an edit from an editor makes new content:
 * its hash changes, and the editors save it without the previous author's stamp (it is stamped with
 * the editor's own account when it is next exported), so the ban no longer applies. The stamp's
 * `content_hash` is checked too: a copy still carrying the stamp was never re-saved from an editor.
 *
 * `useContentRevocationSync` (mounted once in the root layout) sweeps on page load, on every
 * navigation, when the tab comes back into view and every few minutes while it is visible, so a ban
 * reaches a tab that is already open without a reload.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiUrl } from '@/utils/api';
import type { ModeratedContentType } from '@/utils/contentSigning';
import { getLocalStorage } from '@/utils/safeStorage';

interface Collection {
  key: string;
  contentType: ModeratedContentType;
  /** `custom`: `{ custom: { <id>: item } }`; `array`: a plain list of items. */
  shape: 'custom' | 'array';
}

const COLLECTIONS: readonly Collection[] = [
  { key: 'lemondbd_tier_lists', contentType: 'tier_list', shape: 'custom' },
  { key: 'lemondbd_smash_rosters', contentType: 'smash_roster', shape: 'custom' },
  { key: 'lemondbd_custom_minigames', contentType: 'minigame', shape: 'array' },
];
const LEGACY_PREFIXES = ['tier_lists:custom:', 'smash:custom:', 'minigames:custom:'];
const MINIGAME_PROGRESS_PREFIX = 'lemondbd_minigame_progress_';
/** The check endpoint's per-request cap. */
const MAX_HASHES_PER_REQUEST = 200;
/** Focus, navigation and the timer can fire together; one sweep per this window is plenty. */
export const MIN_SWEEP_GAP_MS = 15_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

function isHex64(val: unknown): val is string {
  return typeof val === 'string' && HEX_64_REGEX.test(val);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stampHash(item: unknown): string | null {
  if (!isObject(item)) return null;
  const manifest = item._manifest;
  const hash = isObject(manifest) ? manifest.content_hash : undefined;
  return isHex64(hash) ? hash.toLowerCase() : null;
}

function dispatch(event: Event | { type: string; key?: string; detail?: unknown }): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(event as Event);
  } catch {
    // Graceful fallback for non-browser runtimes
  }
}

function dispatchStorageEvent(key: string): void {
  if (typeof StorageEvent !== 'undefined') dispatch(new StorageEvent('storage', { key }));
  else dispatch({ type: 'storage', key });
}

function dispatchContentRevoked(purged: string[], items: number): void {
  const detail = { count: purged.length, hashes: purged, items };
  if (typeof CustomEvent !== 'undefined') dispatch(new CustomEvent('content-revoked', { detail }));
  else dispatch({ type: 'content-revoked', detail });
}

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** `[ref, item]` pairs: the record id for `custom` collections, the index for arrays. */
function entriesOf(collection: Collection, parsed: unknown): Array<[string, unknown]> {
  if (collection.shape === 'array') {
    return Array.isArray(parsed) ? parsed.map((item, index) => [String(index), item]) : [];
  }
  const custom = isObject(parsed) ? parsed.custom : null;
  return isObject(custom) ? Object.entries(custom) : [];
}

/** Every hash an item can be banned under, keyed by the item's serialised form. */
type ScannedItems = Map<string, Map<string, string[]>>;

async function scanCollections(storage: Storage): Promise<ScannedItems> {
  const { storedContentHashes } = await import('@/utils/contentHash');
  const scanned: ScannedItems = new Map();
  for (const collection of COLLECTIONS) {
    const items = new Map<string, string[]>();
    for (const [, item] of entriesOf(collection, readJson(storage, collection.key))) {
      const stamp = stampHash(item);
      const hashes = [...(stamp ? [stamp] : []), ...(await storedContentHashes(collection.contentType, item))];
      if (hashes.length > 0) items.set(JSON.stringify(item), Array.from(new Set(hashes)));
    }
    scanned.set(collection.key, items);
  }
  return scanned;
}

/** Loose per-item keys written by older builds. */
function scanLegacyKeys(storage: Storage): Map<string, string> {
  const legacy = new Map<string, string>();
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      const item = readJson(storage, key);
      const hash = isObject(item) && isHex64(item.contentHash) ? item.contentHash.toLowerCase() : stampHash(item);
      if (hash) legacy.set(key, hash);
    }
  } catch {
    // Storage access error ignored defensively
  }
  return legacy;
}

async function fetchRevoked(hashes: string[]): Promise<Set<string> | null> {
  const revoked = new Set<string>();
  for (let start = 0; start < hashes.length; start += MAX_HASHES_PER_REQUEST) {
    const res = await fetch(apiUrl('/api/v1/content/revocations/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: hashes.slice(start, start + MAX_HASHES_PER_REQUEST) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { revoked_hashes?: unknown };
    if (Array.isArray(data?.revoked_hashes)) {
      for (const hash of data.revoked_hashes) if (typeof hash === 'string') revoked.add(hash.toLowerCase());
    }
  }
  return revoked;
}

/**
 * Removes the banned items of one collection. Storage is re-read so an edit made while the check
 * was in flight is kept: only an item still identical to the scanned (banned) one is removed.
 */
function purgeCollection(
  storage: Storage,
  collection: Collection,
  banned: Map<string, string[]>
): { hashes: string[]; items: number } {
  const none = { hashes: [] as string[], items: 0 };
  const parsed = readJson(storage, collection.key);
  const doomed = entriesOf(collection, parsed).filter(([, item]) => banned.has(JSON.stringify(item)));
  if (doomed.length === 0) return none;
  try {
    if (collection.shape === 'array') {
      const doomedRefs = new Set(doomed.map(([ref]) => ref));
      const remaining = (parsed as unknown[]).filter((_, index) => !doomedRefs.has(String(index)));
      storage.setItem(collection.key, JSON.stringify(remaining));
    } else {
      const custom = (parsed as { custom: Record<string, unknown> }).custom;
      for (const [ref] of doomed) delete custom[ref];
      storage.setItem(collection.key, JSON.stringify(parsed));
    }
  } catch {
    return none;
  }
  dispatchStorageEvent(collection.key);
  if (collection.contentType === 'minigame') {
    for (const [, item] of doomed) {
      const id = isObject(item) ? item.id : undefined;
      if (typeof id === 'string' || typeof id === 'number') {
        try {
          storage.removeItem(MINIGAME_PROGRESS_PREFIX + id);
        } catch {
          // ignore
        }
      }
    }
  }
  return { hashes: doomed.flatMap(([, item]) => banned.get(JSON.stringify(item)) ?? []), items: doomed.length };
}

async function doCheckAndPurge(): Promise<string[]> {
  try {
    const storage = getLocalStorage();
    if (!storage) return [];

    const scanned = await scanCollections(storage);
    const legacy = scanLegacyKeys(storage);
    const allHashes = new Set<string>(legacy.values());
    for (const items of scanned.values()) for (const hashes of items.values()) hashes.forEach((h) => allHashes.add(h));
    if (allHashes.size === 0) return [];

    const revoked = await fetchRevoked(Array.from(allHashes));
    if (!revoked || revoked.size === 0) return [];

    const purgedSet = new Set<string>();
    let removedItems = 0;
    for (const collection of COLLECTIONS) {
      const banned = new Map<string, string[]>();
      for (const [raw, hashes] of scanned.get(collection.key) ?? []) {
        const hits = hashes.filter((hash) => revoked.has(hash));
        if (hits.length > 0) banned.set(raw, hits);
      }
      if (banned.size === 0) continue;
      const result = purgeCollection(storage, collection, banned);
      result.hashes.forEach((h) => purgedSet.add(h));
      removedItems += result.items;
    }
    for (const [key, hash] of legacy) {
      if (!revoked.has(hash)) continue;
      try {
        storage.removeItem(key);
        dispatchStorageEvent(key);
        purgedSet.add(hash);
        removedItems += 1;
      } catch {
        // Storage remove error ignored defensively
      }
    }

    const purged = Array.from(purgedSet);
    if (purged.length > 0) dispatchContentRevoked(purged, removedItems);
    return purged;
  } catch {
    return [];
  }
}

let syncPromise: Promise<string[]> | null = null;
let lastSweepAt = Number.NEGATIVE_INFINITY;

/**
 * Scans saved tier lists, smash rosters, minigames and legacy keys, asks the server which are banned,
 * removes those and announces it (`storage` per changed key, then one `content-revoked` whose detail
 * carries the purged hashes and `items`, the number of saved items removed).
 * Concurrent calls share the request in flight. Returns the revoked hashes that were purged.
 */
export async function checkAndPurgeRevokedContent(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      return await doCheckAndPurge();
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
}

/** A sweep for the automatic triggers: skipped when one ran less than MIN_SWEEP_GAP_MS ago. */
export function requestRevocationSweep(now: number = Date.now()): Promise<string[]> {
  if (now - lastSweepAt < MIN_SWEEP_GAP_MS) return Promise.resolve([]);
  lastSweepAt = now;
  return checkAndPurgeRevokedContent();
}

/** Root-layout hook: sweeps on load, on navigation, on return to the tab and on a timer while visible. */
export function useContentRevocationSync(): void {
  const pathname = usePathname();

  useEffect(() => {
    void requestRevocationSweep();
  }, [pathname]);

  useEffect(() => {
    const sweepIfVisible = () => {
      if (document.visibilityState === 'visible') void requestRevocationSweep();
    };
    window.addEventListener('focus', sweepIfVisible);
    document.addEventListener('visibilitychange', sweepIfVisible);
    const timer = window.setInterval(sweepIfVisible, SWEEP_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', sweepIfVisible);
      document.removeEventListener('visibilitychange', sweepIfVisible);
      window.clearInterval(timer);
    };
  }, []);
}
