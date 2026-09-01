// frontend/src/app/[locale]/randomizer/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function RandomizerLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800 bg-[#0a0f18]/90" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-8 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="amber"
          needleSpeed={0.9}
          label="Spinning Entity Roulette..."
          sublabel="Randomizing chaotic trial perk loadouts"
        />
      </main>
    </div>
  );
}
