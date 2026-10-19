// frontend/src/services/dataCache.ts
'use client';

/**
 * A small stale-while-revalidate cache for backend reads.
 *
 * The problem it solves: every page fetched its data in a `useEffect` on mount,
 * so leaving a page and coming back re-downloaded everything and showed the
 * spinner again -- even though perks, characters and map data barely change.
 * Worse, /perks refetched the entire 1000-perk list and the full character
 * roster on every page/sort/filter change, none of which those two depend on.
 *
 * Entries live at module scope, so they survive component unmounts and outlive
 * client-side navigation for the whole session. Reads are synchronous, which is
 * what makes a return visit paint instantly instead of flashing a spinner.
 *
 * Deliberately not a dependency: this is ~120 lines and avoids adding a data
 * library to the bundle that the loading spinner is waiting on.
 */

import { getBackendBaseUrl } from '@/utils/api';
import { apiClient } from '@/lib/api-client';

interface CacheEntry<T> {
  data: T;
  /** epoch ms of the last successful write */
  updatedAt: number;
}

/**
 * Most entries kept at once. Every page, sort and search combination of /perks
 * is its own key, so without a ceiling a long session holds all of them.
 */
const MAX_ENTRIES = 50;

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
/**
 * Bumped by `invalidate()`. A request remembers the value it started under and
 * writes its result only if it is unchanged, so a response to a question asked
 * before a mutation cannot put the pre-mutation data back as "fresh".
 */
const generations = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
const revalidators = new Map<string, Set<() => void>>();

/** Default freshness window. Game data changes on patch days, not per minute. */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Freshness window for the static catalog: perks, characters, survivors,
 * killers, items, addons, chapters and maps.
 *
 * Longer than the default because these endpoints carry an ETag derived from the
 * response body, so the two caches divide the work rather than duplicating it:
 * this one avoids making the *request* at all inside the window, and the ETag
 * makes the request *cheap* when it is made -- a few hundred bytes of 304
 * instead of a megabyte of perk list. `fetchJson` sends every such request with
 * `cache: 'no-cache'`, so a request made after the window always reaches the
 * server and sees a re-seed or kill-switch toggle (the browser never answers it
 * from a stale HTTP-cache copy). An ownership edit, a sign-in and a sign-out
 * call `invalidate()` directly.
 */
export const CATALOG_TTL_MS = 30 * 60 * 1000;

/**
 * Builds the cache key -- and, since it is a real URL, the request URL -- for a
 * catalog endpoint.
 *
 * Callers used to hand-roll these strings, so two components asking for the
 * same roster with the query params written in a different order missed each
 * other's entry and paid for the same megabyte twice. Sorting the params makes
 * the key depend on what was asked for rather than on how it was spelled, and
 * skipping empty values keeps `?search=` from forking a second entry for what
 * is really the unfiltered list.
 */
export function catalogKey(
  name: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
): string {
  const search = new URLSearchParams();
  Object.keys(params)
    .sort()
    .forEach((param) => {
      const value = params[param];
      if (value === undefined || value === null || value === '') return;
      search.set(param, String(value));
    });

  const path = `${getBackendBaseUrl()}/api/v1/${name.replace(/^\/+/, '')}`;
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Writes only ever happen from client effects. This guard keeps the map from
 * being populated during SSR, where module scope is shared across requests and
 * one visitor's data could otherwise leak into another's render.
 */
const isClient = () => typeof window !== 'undefined';

function notify(key: string): void {
  listeners.get(key)?.forEach((cb) => {
    try {
      cb();
    } catch {
      // A broken subscriber must not stop the others from updating.
    }
  });
}

/** Synchronous read. Returns undefined on a miss -- callers decide about staleness. */
export function readCache<T>(key: string): T | undefined {
  return (store.get(key) as CacheEntry<T> | undefined)?.data;
}

export function isStale(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.updatedAt > ttlMs;
}

/** Drops the least recently written entries nobody is watching, down to the ceiling. */
function evictOverflow(): void {
  for (const key of store.keys()) {
    if (store.size <= MAX_ENTRIES) return;
    if (!listeners.has(key)) store.delete(key);
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (!isClient()) return;
  // Delete first so a rewritten key moves to the back of the eviction order.
  store.delete(key);
  store.set(key, { data, updatedAt: Date.now() });
  evictOverflow();
  notify(key);
}

/**
 * Runs `refetch` when invalidate() drops `key`. A mounted consumer only fetches
 * on mount or when its key changes, so without this it would stay on its
 * loading state until a reload. Returns the unsubscribe.
 */
export function onInvalidated(key: string, refetch: () => void): () => void {
  let set = revalidators.get(key);
  if (!set) {
    set = new Set();
    revalidators.set(key, set);
  }
  set.add(refetch);
  return () => {
    set!.delete(refetch);
    if (set!.size === 0) revalidators.delete(key);
  };
}

function drop(key: string): void {
  generations.set(key, (generations.get(key) ?? 0) + 1);
  // The request still in flight was asked before the change; the refetch below
  // must not join it.
  inflight.delete(key);
  store.delete(key);
  notify(key);
  revalidators.get(key)?.forEach((refetch) => {
    try {
      refetch();
    } catch {
      // One failing consumer must not stop the others.
    }
  });
}

/**
 * Drops entries whose key starts with `prefix` (or everything, if omitted) and
 * refetches the ones a mounted consumer is showing. Use after a mutation that
 * changes what the server would return -- ownership toggles, for instance,
 * change `is_owned` on perks.
 */
export function invalidate(prefix?: string): void {
  // Keys that are only in flight count too: their first response is also older
  // than the change.
  const keys = new Set([...store.keys(), ...inflight.keys()]);
  for (const key of keys) {
    if (prefix === undefined || key.startsWith(prefix)) drop(key);
  }
}

export function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(key);
  };
}

/**
 * Fetches through the cache, collapsing concurrent callers onto one request.
 *
 * Several components ask for the same character roster on the same page; without
 * this they each fire their own request. `force` skips the freshness check but
 * still dedupes.
 */
export function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; force?: boolean } = {}
): Promise<T> {
  const { ttlMs = DEFAULT_TTL_MS, force = false } = options;

  if (!force && !isStale(key, ttlMs)) {
    return Promise.resolve(readCache<T>(key) as T);
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const generation = generations.get(key) ?? 0;
  const request: Promise<T> = fetcher()
    .then((data) => {
      if ((generations.get(key) ?? 0) === generation) writeCache(key, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/** List endpoints answer with either a bare array or `{ data: [...] }`. */
export type ListPayload<T> = T[] | { data?: T[] };

export function unwrapList<T>(payload: ListPayload<T> | null | undefined): T[] {
  return Array.isArray(payload) ? payload : payload?.data || [];
}

/**
 * GET + json, throwing on a non-2xx so callers can catch.
 *
 * Reads are sent `cache: 'no-cache'`: the browser always revalidates with the
 * ETag instead of answering from its own HTTP cache, which would otherwise hand
 * back a stale copy and let this module file it as fresh for another window.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return apiClient<T>(url, { cache: 'no-cache', ...init });
}
