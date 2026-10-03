'use client';
// frontend/src/components/admin/AdminTabContentSkeleton.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useDictionary } from "@/context/DictionaryContext";

interface AdminTabContentSkeletonProps {
  rows?: number;
}

export const AdminTabContentSkeleton: React.FC<AdminTabContentSkeletonProps> = () => {
  const dict = useDictionary();
  const loadingLabel = dict.admin.loading;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className="rounded-3xl border border-border-color bg-bg-surface p-8 sm:p-12 space-y-4 w-full flex items-center justify-center min-h-[360px] transition-colors duration-200"
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
