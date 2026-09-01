// frontend/src/app/[locale]/perks/loading.tsx
import React from 'react';
import { PerksGridSkeleton } from '@/components/PerksSkeleton';

export default function PerksLoading() {
  return (
    <div className="h-dvh overflow-hidden bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      {/* Sidebar Placeholder */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-800 bg-[#0a0f18]/90 p-4 space-y-4 select-none animate-pulse">
        <div className="h-10 w-36 rounded-xl bg-slate-800/80" />
        <div className="space-y-2 pt-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-9 w-full rounded-xl bg-slate-900 border border-slate-800/60" />
          ))}
        </div>
      </aside>

      {/* Main Perks Skeleton */}
      <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:pl-72">
        <PerksGridSkeleton />
      </main>
    </div>
  );
}
