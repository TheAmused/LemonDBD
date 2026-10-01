// frontend/src/hooks/useEscapeKey.ts
import { useEffect } from 'react';

/** Calls `onEscape` when Escape is pressed, but only while `active` (e.g. a modal is open). */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);
}
