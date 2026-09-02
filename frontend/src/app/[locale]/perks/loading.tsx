// frontend/src/app/[locale]/perks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function PerksLoading() {
  return (
    <div className="h-dvh overflow-hidden bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-800/60 bg-slate-950/60"
      />
      {/* Matches the sidebar's mobile header so nothing shifts vertically
          when the real Sidebar mounts. */}
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-slate-800/60 lg:hidden" />
      <main className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center p-6 lemon-shell-main">
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
