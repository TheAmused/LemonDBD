'use client';
import type { Dictionary } from '@/locales/types';
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

interface UserProfileSkeletonProps {
  dict?: Dictionary | null;
  className?: string;
}

export const UserProfileSkeleton: React.FC<UserProfileSkeletonProps> = ({ dict, className = '' }) => {
  const loadingLabel = dict?.characterDetail?.loading || dict?.app?.loading || 'Loading profile...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300 ${className}`}
    >
      <div aria-hidden="true" className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-200/80 bg-white/80 dark:border-slate-800/60 dark:bg-slate-950/60" />

      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-8">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="amber"
          needleSpeed={1.3}
          label={loadingLabel}
          sublabel="Retrieving player inventory and perk mastery"
          dict={dict}
        />
      </main>
    </div>
  );
};

export default UserProfileSkeleton;
