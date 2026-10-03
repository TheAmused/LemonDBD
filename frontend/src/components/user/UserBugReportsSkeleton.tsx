// frontend/src/components/user/UserBugReportsSkeleton.tsx
'use client';
import type { Dictionary } from '@/locales/types';
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useDictionary } from "@/context/DictionaryContext";

interface UserBugReportsSkeletonProps {
  count?: number;
}

export const UserBugReportsSkeleton: React.FC<UserBugReportsSkeletonProps> = () => {
  const dict = useDictionary();
  const loadingLabel = dict.user.loadingReports;

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
        accent="blood"
        needleSpeed={1.3}
        label={loadingLabel}
      />
    </div>
  );
};
