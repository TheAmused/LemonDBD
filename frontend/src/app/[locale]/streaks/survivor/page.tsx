import React from 'react';
import { Shield } from 'lucide-react';

export default function SurvivorStreaksPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-slate-900/60">
        <Shield className="h-5 w-5 text-emerald-500/70" />
      </div>
      <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
        No survivor streaks yet
      </h2>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        Survivor challenges are still on the drawing board. The killer tab has three to choose from.
      </p>
    </div>
  );
}
