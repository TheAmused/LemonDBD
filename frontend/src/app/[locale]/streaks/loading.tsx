// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { StreaksHubSkeleton } from '@/components/streaks/StreaksSkeleton';

export default function StreaksLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      {/* Sidebar Placeholder */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#0a0f18]/90 p-4 space-y-4 select-none animate-pulse">
        <div className="h-10 w-36 rounded-xl bg-slate-800/80" />
        <div className="space-y-2 pt-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-9 w-full rounded-xl bg-slate-900 border border-slate-800/60" />
          ))}
        </div>
      </aside>

      {/* Main Streaks Hub Skeleton */}
      <main className="flex-1 w-full overflow-y-auto p-5 sm:p-7 lg:p-9 lg:pl-72">
        <StreaksHubSkeleton />
      </main>
    </div>
  );
}
