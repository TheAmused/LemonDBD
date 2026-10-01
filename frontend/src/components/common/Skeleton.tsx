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

/** One line of text. `width` is a Tailwind width class. */
export const SkeletonLine: React.FC<SkeletonProps & { width?: string }> = ({ className, width = 'w-full' }) => (
  <div aria-hidden="true" className={cn(BASE, 'h-3 rounded-md', width, className)} />
);

/** Circular avatar placeholder. */
export const SkeletonAvatar: React.FC<SkeletonProps & { size?: string }> = ({ className, size = 'h-10 w-10' }) => (
  <div aria-hidden="true" className={cn(BASE, 'shrink-0 rounded-full', size, className)} />
);

export const Skeleton = { Block: SkeletonBlock, Line: SkeletonLine, Avatar: SkeletonAvatar };
export default Skeleton;
