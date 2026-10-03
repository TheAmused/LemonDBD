// frontend/src/components/common/Skeleton.tsx
// Tiny loading-placeholder primitives. Page skeletons keep their own layout
// and compose these instead of repeating `animate-pulse rounded bg-bg-elevated`.
import React from 'react';
import { cn } from '@/utils/cn';

const BASE = 'animate-pulse bg-bg-elevated';

export interface SkeletonProps {
  className?: string;
}

/** A rectangular block. Size it with className (e.g. `h-24 w-full`). */
export const SkeletonBlock: React.FC<SkeletonProps & { rounded?: string }> = ({ className, rounded = 'rounded-xl' }) => (
  <div aria-hidden="true" className={cn(BASE, rounded, className)} />
);
