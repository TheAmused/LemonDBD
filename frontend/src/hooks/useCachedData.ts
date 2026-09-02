// frontend/src/hooks/useCachedData.ts
'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  DEFAULT_TTL_MS,
  fetchCached,
  isStale,
  readCache,
  subscribe,
} from '@/services/dataCache';

export interface CachedDataResult<T> {
  data: T | undefined;
  /** True only when there is nothing to show yet -- a cached value means false. */
  loading: boolean;
  /** True while a background revalidation of already-shown data is running. */
  validating: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

/**
 * Reads a cached backend resource, revalidating in the background when stale.
 *
 * The important property is that a warm cache is returned from the *first*
 * render, not from an effect: coming back to a page you have already visited
 * paints the real content immediately instead of re-showing the spinner.
 *
 * Pass `key: null` to skip fetching entirely (e.g. while a slug is unresolved).
 */
export function useCachedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; enabled?: boolean } = {}
): CachedDataResult<T> {
  const { ttlMs = DEFAULT_TTL_MS, enabled = true } = options;
  const active = enabled && key !== null;

  // Keep the latest fetcher without making it a dependency -- callers almost
  // always pass an inline arrow, which would otherwise refetch every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // useSyncExternalStore keeps this in step with writes from other components
  // (and with invalidate()) without a subscribe/setState dance of our own.
  const data = useSyncExternalStore<T | undefined>(
    useCallback((cb) => (active ? subscribe(key, cb) : () => {}), [key, active]),
    useCallback(() => (active ? readCache<T>(key) : undefined), [key, active]),
    // Server snapshot: the cache is never populated during SSR, so the first
    // client render matches the server and hydration stays quiet.
    () => undefined
  );

  const [validating, setValidating] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(
    async (force: boolean) => {
      if (!active) return;
      setValidating(true);
      try {
        await fetchCached<T>(key, () => fetcherRef.current(), { ttlMs, force });
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setValidating(false);
      }
    },
    [key, active, ttlMs]
  );

  useEffect(() => {
    if (!active) return;
    // A fresh entry needs no work at all -- this is the "instant return" path.
    if (!isStale(key, ttlMs)) return;
    void run(false);
  }, [key, active, ttlMs, run]);

  const refresh = useCallback(() => run(true), [run]);

  return {
    data,
    loading: active && data === undefined,
    validating,
    error,
    refresh,
  };
}
