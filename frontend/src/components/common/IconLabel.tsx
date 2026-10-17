// frontend/src/components/common/IconLabel.tsx
// A small icon followed by a line of text: the facts row of a history entry, the heading of a settings group.
import React from 'react';
import { cn } from '@/utils/cn';

export interface IconLabelProps {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  /** The element to render; `label` when it names a control. */
  as?: 'div' | 'span' | 'label';
  /** `fact` is a plain line of text; `heading` is the small muted caps above a group. */
  variant?: 'fact' | 'heading';
  className?: string;
  children: React.ReactNode;
}

const VARIANTS = {
  fact: 'type-strong text-text-secondary',
  heading: 'type-label-xs text-text-muted',
} as const;

export function IconLabel({ icon: Icon, as: Tag = 'div', variant = 'fact', className, children }: IconLabelProps) {
  return (
    <Tag className={cn('flex items-center gap-1.5', VARIANTS[variant], className)}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
