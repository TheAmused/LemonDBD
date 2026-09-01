// frontend/src/app/[locale]/perks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function PerksLoading() {
  return (
    <div className="h-dvh overflow-hidden bg-[#070b12] text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800/60 bg-slate-950/60" />
      <main className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center p-6 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="crimson"
          needleSpeed={1.2}
          label="Calibrating Perks Vault..."
          sublabel="Synchronizing survivor & killer trial perks"
        />
      </main>
    </div>
  );
}
