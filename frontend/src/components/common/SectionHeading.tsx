// frontend/src/components/common/SectionHeading.tsx
// The heading of a content section on a detail page, usually followed by a count Badge.
import React from 'react';
import { cn } from '@/utils/cn';

export interface SectionHeadingProps {
  /** h2 for a page section, h3 for one nested in another. */
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function SectionHeading({ as: Tag = 'h2', id, className, children }: SectionHeadingProps) {
  return (
    <Tag id={id} className={cn('flex items-center gap-2 text-lg font-black tracking-tight text-text-primary', className)}>
      {children}
    </Tag>
  );
}
