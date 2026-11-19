// frontend/src/hooks/useFinePointer.ts
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';

const QUERY = '(hover: hover) and (pointer: fine)';

/**
 * True when the primary input can hover precisely (mouse / trackpad), i.e. a
 * desktop. False on phones and tablets, and during SSR / first paint so the
 * touch-friendly UI is the safe default.
 */
export function useFinePointer(): boolean {
  return useMediaQuery(QUERY) === true;
}
