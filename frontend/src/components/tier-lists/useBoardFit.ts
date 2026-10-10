'use client';
// frontend/src/components/tier-lists/useBoardFit.ts

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { computeFit, type FitInput, type FitResult } from '@/utils/tierLists/fit';

/** Below this window height the page scrolls instead of being locked to the viewport (see the tier list pages). */
const SHORT_VIEWPORT_QUERY = '(max-height: 439px)';

interface Box {
  width: number;
  height: number;
  poolHead: number;
}

export type BoardFitParams = Omit<FitInput, 'width' | 'height' | 'poolHeadHeight'>;

/**
 * Measures the board and returns the tile sizing that makes everything fit it
 * (null until the first measurement). The measured box is the board's own,
 * which does not depend on its content, so the result cannot feed back into
 * what it measures -- except on short windows, where the page is allowed to
 * grow and the window height is used instead.
 */
export function useBoardFit(ref: RefObject<HTMLElement | null>, params: BoardFitParams): FitResult | null {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const head = () => el.querySelector<HTMLElement>('[data-pool-head]');
    const read = () => {
      const short = window.matchMedia(SHORT_VIEWPORT_QUERY).matches;
      const next: Box = {
        width: el.clientWidth,
        height: short ? window.innerHeight : el.clientHeight,
        poolHead: head()?.offsetHeight ?? 64,
      };
      if (next.width <= 0 || next.height <= 0) return;
      setBox((prev) =>
        prev && prev.width === next.width && prev.height === next.height && prev.poolHead === next.poolHead ? prev : next
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    const headEl = head();
    if (headEl) observer.observe(headEl);
    window.addEventListener('resize', read);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [ref]);

  const { tierCounts, poolCount, shape, showNames, poolCollapsed } = params;
  // Tier counts arrive as a fresh array each render; key on the numbers.
  const countsKey = tierCounts.join(',');
  return useMemo(
    () =>
      box
        ? computeFit({
            width: box.width,
            height: box.height,
            poolHeadHeight: box.poolHead,
            tierCounts: countsKey ? countsKey.split(',').map(Number) : [],
            poolCount,
            shape,
            showNames,
            poolCollapsed,
          })
        : null,
    [box, countsKey, poolCount, shape, showNames, poolCollapsed]
  );
}
