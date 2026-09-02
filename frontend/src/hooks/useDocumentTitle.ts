// frontend/src/hooks/useDocumentTitle.ts
'use client';

import { useEffect } from 'react';

/**
 * Sets `document.title` for a client page.
 *
 * Page titles used to be assigned inside the same effect that loaded the
 * dictionary. Now that the dictionary arrives from the server layout, the title
 * is the only thing that effect was still needed for.
 */
export function useDocumentTitle(title: string | undefined | null): void {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
