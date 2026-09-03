'use client';
// frontend/src/components/admin/AdminPanelSkeleton.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { DbdSpinner } from '@/components/DbdSpinner';

interface AdminPanelSkeletonProps {
  dict?: Dictionary | null;
  className?: string;
}

export const AdminPanelSkeleton: React.FC<AdminPanelSkeletonProps> = ({ dict, className = '' }) => {
  const loadingLabel = dict?.admin?.verifyingAdminAccess || dict?.admin?.loading || '';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={`min-h-screen bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-200 ${className}`}
    >
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-border-color bg-bg-surface/80"
      />

      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-8">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="gold"
          needleSpeed={1.3}
          label={loadingLabel}
          dict={dict}
        />
      </main>
    </div>
  );
};

export default AdminPanelSkeleton;

