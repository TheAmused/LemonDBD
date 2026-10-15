// frontend/src/components/common/InlineLink.tsx
// A link-looking button inside a sentence ("I accept the {Terms}", "{Retry}"). It reads as part of the
// text, so it has no box. Standalone text actions use <Button variant="link" ...> instead.
import React from 'react';
import { cn } from '@/utils/cn';

export type InlineLinkTone = 'red' | 'current';

const TONES: Record<InlineLinkTone, string> = {
  red: 'text-accent-red hover:opacity-80',
  current: 'hover:opacity-80',
};

export interface InlineLinkProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** red for plain text, current inside a coloured notice (keeps the notice's colour). */
  tone?: InlineLinkTone;
}

export function InlineLink({ tone = 'red', className, children, ...rest }: InlineLinkProps) {
  return (
    <button
      type="button"
      className={cn('cursor-pointer font-bold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red', TONES[tone], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
