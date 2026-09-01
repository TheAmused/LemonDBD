'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserProfileSkeleton.tsx
//
// Layout-matched skeleton for the /user page shell: header card (avatar +
// name + role badge), the metrics grid, subtab switcher, and the two-column
// overview (profile form + quick shortcuts). Every placeholder reserves the
// same box size as its real counterpart so mounting the real content causes
// zero layout shift.

import React from 'react';

interface UserProfileSkeletonProps {
  dict?: Dictionary | null;
  className?: string;
}

export const UserProfileSkeleton: React.FC<UserProfileSkeletonProps> = ({ dict, className = '' }) => {
  const loadingLabel = dict?.characterDetail?.loading || 'Loading profile...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={`min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay animate-pulse ${className}`}
    >
      {/* Sidebar placeholder (matches collapsed-desktop width) */}
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800/60 bg-slate-950/60" />

      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Header card placeholder */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-slate-800/80 shrink-0" />
              <div className="flex-1 w-full space-y-3">
                <div className="h-6 w-48 rounded bg-slate-800/80 mx-auto sm:mx-0" />
                <div className="h-3.5 w-64 rounded bg-slate-800/60 mx-auto sm:mx-0" />
                <div className="h-3.5 w-40 rounded bg-slate-800/60 mx-auto sm:mx-0" />
              </div>
            </div>
          </div>

          {/* Metrics grid placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-slate-800/80 bg-slate-900/60" />
            ))}
          </div>

          {/* Subtabs placeholder */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            <div className="h-11 w-40 rounded-xl bg-slate-800/70" />
            <div className="h-11 w-40 rounded-xl bg-slate-800/40" />
          </div>

          {/* Overview two-column placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 rounded-3xl border border-slate-800/80 bg-slate-900/70" />
            <div className="h-64 rounded-3xl border border-slate-800 bg-slate-900/70" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfileSkeleton;
