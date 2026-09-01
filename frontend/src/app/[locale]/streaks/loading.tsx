// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function StreaksLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#0a0f18]/90" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-9 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="violet"
          needleSpeed={1.1}
          label="Synchronizing Trial Streaks..."
          sublabel="Validating gauntlet records and victory metrics"
        />
      </main>
    </div>
  );
}
