'use client';
// frontend/src/app/[locale]/error.tsx
//
// Error boundary for every page under /[locale]: a component that throws while rendering shows
// this inside the normal app shell (sidebar, providers) instead of taking the whole page down.
// "Try again" re-renders the segment that failed. Errors in the locale layout itself are caught
// by app/global-error.tsx.

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';

// Loaded only when something has actually crashed: this boundary is part of every page's bundle,
// and ErrorPage (with the page shell it renders) would otherwise add ~10KB gzip to each of them.
const ErrorPage = dynamic(() => import('@/components/layout/ErrorPage').then((m) => m.ErrorPage));

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return <ErrorPage variant="error" onRetry={reset} reference={error.digest} />;
}
