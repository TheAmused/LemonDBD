// frontend/src/app/[locale]/randomizer/loading.tsx
//
// Mirrors the randomizer page's own Suspense fallback exactly -- same skeleton,
// same <main> classes -- so the handover from the route loading state to the
// page is invisible instead of a second, re-positioned spinner.
import React from 'react';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';

export default function RandomizerLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-800 bg-[#0a0f18]/90"
      />
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-slate-800/60 lg:hidden" />
      <main className="flex-1 w-full min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col lemon-shell-main">
        <RandomizerPageSkeleton />
      </main>
    </div>
  );
}
