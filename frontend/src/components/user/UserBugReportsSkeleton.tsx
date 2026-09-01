'use client';
import type { Dictionary } from '@/locales/types';
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

interface UserBugReportsSkeletonProps {
  dict?: Dictionary | null;
  count?: number;
}

export const UserBugReportsSkeleton: React.FC<UserBugReportsSkeletonProps> = ({ dict }) => {
  const loadingLabel = dict?.user?.loadingReports || dict?.app?.loading || 'Loading your reported tickets...';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className="space-y-6 w-full min-h-[320px] flex items-center justify-center p-6"
    >
      <DbdSpinner
        size="lg"
        layout="inline"
        accent="amber"
        needleSpeed={1.3}
        label={loadingLabel}
        dict={dict}
      />
    </div>
  );
};

export default UserBugReportsSkeleton;
