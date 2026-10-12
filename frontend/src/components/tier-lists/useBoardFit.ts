'use client';
// frontend/src/components/tier-lists/useBoardFit.ts

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { computeFit, type FitInput, type FitResult } from '@/utils/tierLists/fit';

interface Box {
  width: number;
  height: number;
  poolHead: number;
}

export type BoardFitParams = Omit<FitInput, 'width' | 'height' | 'poolHeadHeight'>;

/**
 * Measures the board width and available viewport height below the board top
 * to compute tile sizing for the chosen scale or 'fit' screenshot mode.
 */
export function useBoardFit(ref: RefObject<HTMLElement | null>, params: BoardFitParams): FitResult | null {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const head = () => el.querySelector<HTMLElement>('[data-pool-head]');
    const read = () => {
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
      const next: Box = {
        width: el.clientWidth,
        height: Math.max(320, window.innerHeight - Math.min(top, 140) - 16),
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

  const { tierCounts, poolCount, shape, showNames, poolCollapsed, scale } = params;
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
            scale,
          })
        : null,
    [box, countsKey, poolCount, shape, showNames, poolCollapsed, scale]
  );
}
