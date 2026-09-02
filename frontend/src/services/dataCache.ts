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

interface CacheEntry<T> {
  data: T;
  /** epoch ms of the last successful write */
  updatedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();

/** Default freshness window. Game data changes on patch days, not per minute. */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

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

export function writeCache<T>(key: string, data: T): void {
  if (!isClient()) return;
  store.set(key, { data, updatedAt: Date.now() });
  notify(key);
}

/**
 * Drops entries whose key starts with `prefix` (or everything, if omitted), so
 * the next read refetches. Use after a mutation that changes what the server
 * would return -- ownership toggles, for instance, change `is_owned` on perks.
 */
export function invalidate(prefix?: string): void {
  if (prefix === undefined) {
    const keys = [...store.keys()];
    store.clear();
    keys.forEach(notify);
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      notify(key);
    }
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

  const request = fetcher()
    .then((data) => {
      writeCache(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/** Convenience wrapper: GET + json, throwing on a non-2xx so callers can catch. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}
