// frontend/src/app/[locale]/smash-or-pass/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function SmashOrPassLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-950/95" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-8 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.0}
          label="Entering Smash or Pass Arena..."
          sublabel="Summoning community rating candidates"
        />
      </main>
    </div>
  );
}
