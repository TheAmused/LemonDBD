'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserBugReportsSkeleton.tsx
//
// Layout-matched skeleton for the "My Bug Reports" subtab: header row +
// N report-card placeholders, matching UserBugReportsList's card shape so
// swapping in real data causes no layout shift.

import React from 'react';

interface UserBugReportsSkeletonProps {
  dict?: Dictionary | null;
  count?: number;
}

export const UserBugReportsSkeleton: React.FC<UserBugReportsSkeletonProps> = ({ dict, count = 3 }) => {
  const loadingLabel = dict?.user?.loadingReports || 'Loading your reported tickets...';

  return (
    <div role="status" aria-busy="true" aria-label={loadingLabel} className="space-y-6 w-full animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-6 w-56 rounded bg-slate-800/70" />
        <div className="h-10 w-full sm:w-40 rounded-xl bg-slate-800/70" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="h-4 w-40 rounded bg-slate-800/70" />
              <div className="h-5 w-20 rounded-lg bg-slate-800/70" />
            </div>
            <div className="h-3 w-full rounded bg-slate-800/50" />
            <div className="h-3 w-3/4 rounded bg-slate-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserBugReportsSkeleton;
