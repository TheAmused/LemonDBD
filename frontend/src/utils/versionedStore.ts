// frontend/src/utils/versionedStore.ts
/**
 * Generic client-only persistence: one localStorage key holding one versioned
 * document, read through a tiny external store (subscribe + cached snapshot)
 * that `useSyncExternalStore` consumes. That gives a stable server snapshot
 * (no hydration mismatch), every mounted component seeing a write
 * immediately, and other tabs catching up through the `storage` event.
 *
 * Every access is guarded -- private mode, a sandboxed iframe or a full quota
 * degrade to "not saved", reported to the caller, never an exception.
 *
 * Feature modules (tier lists, smash-or-pass rosters) supply the key, the
 * empty state and a `migrate` that defensively parses whatever is stored.
 */
import { getLocalStorage } from '@/utils/safeStorage';

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
    } catch {
      // Corrupt JSON: start empty rather than crash the page. The bad value is
      // left in place until the next successful save overwrites it.
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
    snapshot = null; // another tab wrote -- re-read lazily
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
      }
    };
  }

  /** Cached: `useSyncExternalStore` requires the same object until something changes. */
  function getSnapshot(): S {
    if (snapshot === null) snapshot = load();
    return snapshot;
  }

  function getServerSnapshot(): S {
    return empty;
  }

  /** Applies `mutate` to the current state, persists it, and notifies subscribers. */
  function update(mutate: (state: S) => S): SaveResult {
    const next = mutate(getSnapshot());
    const result = save(next);
    // Keep the in-memory copy even when saving failed, so what the user is
    // looking at does not jump back; the caller surfaces the "not saved" notice.
    snapshot = next;
    emit();
    return result;
  }

  function resetCache(): void {
    snapshot = null;
  }

  return { load, save, subscribe, getSnapshot, getServerSnapshot, update, resetCache };
}
