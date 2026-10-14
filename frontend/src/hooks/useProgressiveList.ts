// frontend/src/hooks/useProgressiveList.ts
'use client';

import { useEffect, useState } from 'react';

export interface ProgressiveList {
  /** How many of the items to render right now. */
  limit: number;
  /** Ref callback for the scrolling container the items live in. */
  rootRef: (node: HTMLElement | null) => void;
  /** Ref callback for an element placed right after the last rendered item. */
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Renders a long list in chunks: the first `step` items at once, the next chunk
 * whenever the sentinel after the last one scrolls near the container's edge.
 * `resetKey` (a search term, a filter) starts the list over from the first chunk
 * and scrolls the container back to the top.
 */
export function useProgressiveList(total: number, resetKey: string, step = 32): ProgressiveList {
  const [state, setState] = useState({ key: resetKey, limit: step });
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  // Reset while rendering, so the render after a new search never maps the old, longer limit.
  if (state.key !== resetKey) setState({ key: resetKey, limit: step });
  const limit = state.key === resetKey ? state.limit : step;

  useEffect(() => {
    if (root) root.scrollTop = 0;
  }, [root, resetKey]);

  useEffect(() => {
    if (!root || !sentinel || limit >= total) return;
    // A fresh observer reports the sentinel's current state, so chunks keep
    // coming until it sits outside the margin around the container.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState((current) => ({ ...current, limit: Math.min(current.limit + step, total) }));
        }
      },
      { root, rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [root, sentinel, limit, total, step]);

  return { limit, rootRef: setRoot, sentinelRef: setSentinel };
}
