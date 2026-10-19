// frontend/src/lib/storage.ts
/**
 * Generic client-only persistence and safe localStorage helpers.
 * Consolidated core infrastructure under src/lib/.
 */

/** The browser's localStorage, or null when unavailable / access throws. */
export function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    // Non-browser runtimes (unit tests install a mock on globalThis).
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    getLocalStorage()?.setItem(key, value);
    return getLocalStorage() !== null;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    getLocalStorage()?.removeItem(key);
    return getLocalStorage() !== null;
  } catch {
    return false;
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readNumber(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(err.message))
  );
}

/** A short random id (10 base-36 chars) for a new user-created item. */
export function createRandomId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

export interface VersionedStoreConfig<S> {
  /** The localStorage key. */
  key: string;
  /** Frozen state returned when nothing (valid) is stored. */
  empty: S;
  /** Upgrades any stored shape to the current one. Must never throw on junk. */
  migrate: (raw: unknown) => S;
}

export interface VersionedStore<S> {
  load: (storage?: Storage | null) => S;
  save: (state: S, storage?: Storage | null) => SaveResult;
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => S;
  getServerSnapshot: () => S;
  update: (mutate: (state: S) => S) => SaveResult;
  /** Test hook: forget the cached snapshot so the next read hits storage. */
  resetCache: () => void;
}

export function createVersionedStore<S>({ key, empty, migrate }: VersionedStoreConfig<S>): VersionedStore<S> {
  const listeners = new Set<() => void>();
  let snapshot: S | null = null;
  let storageListenerAttached = false;

  function load(storage: Storage | null = getLocalStorage()): S {
    if (!storage) return empty;
    try {
      const raw = storage.getItem(key);
      if (!raw) return empty;
      return migrate(JSON.parse(raw));
    } catch (err) {
      console.warn(`[versionedStore] Corrupt data in localStorage key "${key}", falling back to empty state:`, err);
      return empty;
    }
  }

  function save(state: S, storage: Storage | null = getLocalStorage()): SaveResult {
    if (!storage) return { ok: false, reason: 'unavailable' };
    try {
      storage.setItem(key, JSON.stringify(state));
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: isQuotaError(err) ? 'quota' : 'unavailable' };
    }
  }

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
    if (event.key !== null && event.key !== key) return;
    snapshot = null;
    emit();
  }

  function subscribe(cb: () => void): () => void {
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
        // Without the listener other tabs' writes go unseen; reload on the next read.
        snapshot = null;
      }
    };
  }

  function getSnapshot(): S {
    if (snapshot === null) snapshot = load();
    return snapshot;
  }

  function getServerSnapshot(): S {
    return empty;
  }

  function update(mutate: (state: S) => S): SaveResult {
    // Nobody subscribed means the snapshot may be stale: build on what is stored now.
    const storage = getLocalStorage();
    const current = listeners.size === 0 && storage ? load(storage) : getSnapshot();
    const next = mutate(current);
    const result = save(next);
    snapshot = next;
    emit();
    return result;
  }

  function resetCache(): void {
    snapshot = null;
  }

  return { load, save, subscribe, getSnapshot, getServerSnapshot, update, resetCache };
}
