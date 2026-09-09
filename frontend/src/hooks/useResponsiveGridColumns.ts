// frontend/src/hooks/useResponsiveGridColumns.ts
import { useEffect, useState } from 'react';

export interface GridColumnBreakpoint {
  minWidth: number;
  columns: number;
}

/** Tracks how many columns a CSS grid is *actually* rendering at the current
 * viewport width, given the same minWidth/columns breakpoints as its Tailwind
 * grid-cols-* classes -- CSS grid doesn't expose its resolved column count
 * through any DOM API, so callers that need to compute per-row layout (e.g.
 * placing an expand panel after the last card of a row) have to mirror the
 * breakpoints by hand instead. */
export function useResponsiveGridColumns(
  breakpoints: GridColumnBreakpoint[],
  defaultColumns: number
): number {
  const [columns, setColumns] = useState(defaultColumns);
  useEffect(() => {
    function computeColumns() {
      const match = breakpoints.find((bp) => window.innerWidth >= bp.minWidth);
      setColumns(match ? match.columns : defaultColumns);
    }
    computeColumns();
    window.addEventListener('resize', computeColumns);
    return () => window.removeEventListener('resize', computeColumns);
  }, [breakpoints, defaultColumns]);
  return columns;
}
