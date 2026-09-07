// frontend/src/app/[locale]/randomizer/loading.tsx
//
// Mirrors the randomizer page's own Suspense fallback exactly -- both render
// through the shared PageShellFallback with the same skeleton and layout --
// so the handover from the route loading state to the page is invisible
// instead of a second, re-positioned spinner.
import React from 'react';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { PageShellFallback } from '@/components/layout/PageShellFallback';

export default function RandomizerLoading() {
  return (
    <PageShellFallback
      padding="flush"
      mainClassName="min-h-screen overflow-y-auto flex flex-col"
      skeleton={<RandomizerPageSkeleton />}
    />
  );
}
