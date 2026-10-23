// frontend/src/components/user/UserProfileSkeleton.tsx
'use client';
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { useDictionary } from "@/context/DictionaryContext";

interface UserProfileSkeletonProps {
  className?: string;
}

export const UserProfileSkeleton: React.FC<UserProfileSkeletonProps> = ({ className = '' }) => {
  const dict = useDictionary();
  const loadingLabel = dict.characterDetail.loading;

  // Content only: the sidebar and <main> come from AppShell, so there is no placeholder sidebar here.
  return (
    <output
      aria-busy="true"
      aria-label={loadingLabel}
      className={`flex min-h-skeleton-page w-full flex-1 items-center justify-center p-6 lg:p-8 ${className}`}
    >
      <DbdSpinner
        size="responsive"
        layout="inline"
        accent="blood"
        needleSpeed={1.3}
        label={loadingLabel}
        sublabel={dict.user.loadingProfileSub}
      />
    </output>
  );
};
