'use client';
// frontend/src/hooks/useLatest.ts

import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the latest `value`, for listeners and timers that outlive a render
 * (window listeners, drag handlers) and must call the newest callback. It is updated after each
 * render commits, so reading it during render is not allowed; read it in handlers and effects.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
