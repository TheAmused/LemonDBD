'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminPanelSkeleton.tsx
//
// Layout-matched skeleton for the /admin shell: header bar, 5-column stats
// grid, subtab switcher, and a table-shaped placeholder for the default
// "Users" tab. Every box reserves the same footprint as its real
// counterpart so hydration causes zero layout shift.

import React from 'react';

interface AdminPanelSkeletonProps {
  dict?: Dictionary | null;
  className?: string;
}

export const AdminPanelSkeleton: React.FC<AdminPanelSkeletonProps> = ({ dict, className = '' }) => {
  const loadingLabel = dict?.admin?.verifyingAdminAccess || 'Loading admin panel...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={`min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay animate-pulse ${className}`}
    >
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800/60 bg-slate-950/60" />

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header placeholder */}
          <div className="h-20 rounded-3xl border border-slate-800 bg-slate-900/60" />

          {/* Stats grid placeholder */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-20 rounded-2xl border border-slate-800 bg-slate-900/60 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
              />
            ))}
          </div>

          {/* Subtab switcher placeholder */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 w-32 rounded-xl bg-slate-800/60" />
            ))}
          </div>

          {/* Table shell placeholder */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 space-y-4">
            <div className="h-9 w-full sm:w-96 rounded-xl bg-slate-800/60" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-full rounded-lg bg-slate-800/40" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanelSkeleton;
