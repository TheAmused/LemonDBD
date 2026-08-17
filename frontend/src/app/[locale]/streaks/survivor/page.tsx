import React from 'react';
import { Shield } from 'lucide-react';

export default function SurvivorStreaksPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30 px-6 py-20 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-slate-900/60 shadow-sm">
        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-800 dark:text-slate-300">
        No survivor streaks yet
      </h2>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Survivor challenges are still on the drawing board. The killer tab has three to choose from.
      </p>
    </div>
  );
}
