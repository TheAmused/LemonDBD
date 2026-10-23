// frontend/src/app/[locale]/randomizer/loading.tsx
//
// Mirrors the randomizer page's own Suspense fallback exactly -- the same skeleton, inside the
// same <main> -- so the handover from the route loading state to the page is invisible instead of
// a second, re-positioned spinner.
import React from 'react';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';

export default function RandomizerLoading() {
  return <RandomizerPageSkeleton />;
}
