// frontend/src/app/[locale]/maps/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function MapsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#0a0f18]/90" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-7 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="cyan"
          needleSpeed={1.6}
          label="Surveying Realms & Seeds..."
          sublabel="Mapping tile variants, loops, and spawn coordinates"
        />
      </main>
    </div>
  );
}
