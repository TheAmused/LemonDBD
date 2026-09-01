// frontend/src/app/[locale]/randomizer/loading.tsx
import React from 'react';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';

export default function RandomizerLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      {/* Sidebar Placeholder */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-800 bg-[#0a0f18]/90 p-4 space-y-4 select-none animate-pulse">
        <div className="h-10 w-36 rounded-xl bg-slate-800/80" />
        <div className="space-y-2 pt-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-9 w-full rounded-xl bg-slate-900 border border-slate-800/60" />
          ))}
        </div>
      </aside>

      {/* Main Randomizer Skeleton */}
      <main className="flex-1 w-full min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pl-72 flex flex-col items-center">
        <RandomizerPageSkeleton />
      </main>
    </div>
  );
}
