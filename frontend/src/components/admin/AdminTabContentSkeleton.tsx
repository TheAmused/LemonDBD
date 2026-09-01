'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminTabContentSkeleton.tsx
//
// Generic layout-matched placeholder used as the Suspense/next-dynamic
// fallback for admin subtabs (Kill Switches, Challenge Stats, Audit Log,
// Bug Reports) while their code-split chunk loads. Sized to roughly match
// a full-width panel so the tab switch doesn't cause a visible jump.

import React from 'react';

interface AdminTabContentSkeletonProps {
  dict?: Dictionary | null;
  rows?: number;
}

export const AdminTabContentSkeleton: React.FC<AdminTabContentSkeletonProps> = ({ dict, rows = 5 }) => {
  const loadingLabel = dict?.admin?.loading || 'Loading...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 space-y-4 w-full animate-pulse"
    >
      <div className="h-6 w-56 rounded bg-slate-800/70" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-xl bg-slate-800/40" />
      ))}
    </div>
  );
};

export default AdminTabContentSkeleton;
