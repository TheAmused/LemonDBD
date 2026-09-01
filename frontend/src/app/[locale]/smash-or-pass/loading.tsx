// frontend/src/app/[locale]/smash-or-pass/loading.tsx
import { SmashHubSkeleton } from '@/components/smash-or-pass/SmashOrPassSkeleton';

export default function SmashOrPassLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      {/* Sidebar Placeholder Skeleton */}
      <aside
        className="hidden lg:flex flex-col w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-950/95 p-4 space-y-4 select-none animate-pulse"
        aria-hidden="true"
      >
        <div className="flex items-center gap-3 px-2 py-3 border-b border-zinc-800">
          <div className="h-9 w-9 rounded-xl bg-pink-500/20" />
          <div className="h-5 w-32 bg-zinc-800 rounded-lg" />
        </div>
        <div className="space-y-2 py-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-10 rounded-2xl bg-zinc-900/60 border border-zinc-800/50" />
          ))}
        </div>
      </aside>

      {/* Main Smash Arena Skeleton matching exact layout to prevent CLS */}
      <main className="flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 lg:pl-72">
        <SmashHubSkeleton />
      </main>
    </div>
  );
}
