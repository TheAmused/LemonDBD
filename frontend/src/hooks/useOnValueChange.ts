'use client';
// frontend/src/hooks/useOnValueChange.ts

import { useState } from 'react';

/**
 * Calls `onChange` during render whenever `value` differs from the last render's (Object.is),
 * so state that depends on it (a reset form, a cleared error) updates in the same render instead
 * of an effect painting the stale state first. `onChange` may only set state of this component.
 * Pass a string key to watch several values at once.
 */
export function useOnValueChange<T>(value: T, onChange: (value: T, previous: T) => void): void {
  const [previous, setPrevious] = useState(value);
  if (!Object.is(previous, value)) {
    setPrevious(value);
    onChange(value, previous);
  }
}
