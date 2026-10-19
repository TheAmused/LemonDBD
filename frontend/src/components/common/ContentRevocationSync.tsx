'use client';
// frontend/src/components/common/ContentRevocationSync.tsx
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useContentRevocationSync } from '@/hooks/useContentRevocationSync';

const ContentRemovedNotice = dynamic(() => import('./ContentRemovedNotice').then((m) => m.ContentRemovedNotice), {
  ssr: false,
});

/**
 * Headless in the normal case: mounts the content revocation sweep in the root layout. When the
 * sweep deletes saved content a moderator banned, it tells the person what happened, since their
 * list, roster or trial would otherwise just vanish.
 */
export function ContentRevocationSync() {
  useContentRevocationSync();
  const [removed, setRemoved] = useState(0);

  useEffect(() => {
    const onRevoked = (event: Event) => {
      const items = (event as CustomEvent<{ items?: unknown }>).detail?.items;
      if (typeof items === 'number' && items > 0) setRemoved((count) => count + items);
    };
    window.addEventListener('content-revoked', onRevoked);
    return () => window.removeEventListener('content-revoked', onRevoked);
  }, []);

  return removed > 0 ? <ContentRemovedNotice count={removed} onDismiss={() => setRemoved(0)} /> : null;
}
