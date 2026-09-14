// frontend/src/app/[locale]/streaks/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function StreaksLoading() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-border-color bg-bg-surface"
      />
      {/* Matches the sidebar's mobile header so nothing shifts vertically
          when the real Sidebar mounts. */}
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-border-color lg:hidden" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-9 lemon-shell-main">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.1}
          label="Synchronizing Trial Streaks..."
          sublabel="Validating gauntlet records and victory metrics"
        />
      </main>
    </div>
  );
}
