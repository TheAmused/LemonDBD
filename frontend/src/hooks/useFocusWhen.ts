// frontend/src/hooks/useFocusWhen.ts
'use client';

import { useEffect, useRef } from 'react';

/**
 * Focuses the returned ref's element whenever `when` becomes true (and on mount if it already is).
 *
 * For a step that replaces what the user was working in -- the code field that appears after the
 * password step, the recovery-code box after "use a recovery code" -- where WAI-ARIA has focus move
 * to the new content. A field that is there when a <Modal> or <Popover> opens takes
 * `data-autofocus` instead; those components move focus in themselves.
 */
export function useFocusWhen<T extends HTMLElement>(when: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (when) ref.current?.focus({ preventScroll: true });
  }, [when]);
  return ref;
}
