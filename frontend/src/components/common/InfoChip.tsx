// frontend/src/components/common/InfoChip.tsx
//
// The one NON-clickable label ("Base game", "Oct 2024", "Licensed"). Flat, borderless, small
// corners, no hover -- the opposite of a clickable capsule (see common/LinkPill), so the two are
// never confused and the difference is shape, not only colour.
import React from 'react';
import { cn } from '@/utils/cn';

export function InfoChip({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip bg-bg-elevated/60 px-2.5 py-1.5 type-strong text-text-secondary cursor-default select-none',
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
