'use client';
// frontend/src/components/tier-lists/TierListSkeleton.tsx

import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import type { Dictionary } from '@/locales/types';

interface TierListSkeletonProps {
  dict?: Dictionary;
  label?: string;
  className?: string;
}

/** Loading state for the tier-list pages: the site-wide skill-check spinner. */
export function TierListSkeleton({ dict, label, className = '' }: TierListSkeletonProps) {
  const text = label || dict?.tierLists?.loading || dict?.app?.loading;
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className={`flex min-h-[460px] w-full select-none flex-col items-center justify-center p-6 ${className}`}
    >
      <DbdSpinner size="responsive" layout="inline" accent="blood" needleSpeed={1.6} label={text} dict={dict} />
    </div>
  );
}

export default TierListSkeleton;
