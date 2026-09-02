'use client';
import type { Dictionary } from '@/locales/types';
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

interface AdminTabContentSkeletonProps {
  dict?: Dictionary | null;
  rows?: number;
}

export const AdminTabContentSkeleton: React.FC<AdminTabContentSkeletonProps> = ({ dict }) => {
  const loadingLabel = dict?.admin?.loading || 'Loading admin tab...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-8 sm:p-12 space-y-4 w-full flex items-center justify-center min-h-[360px]"
    >
      <DbdSpinner
        size="lg"
        layout="inline"
        accent="gold"
        needleSpeed={1.3}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default AdminTabContentSkeleton;
