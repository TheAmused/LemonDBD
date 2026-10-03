// frontend/src/components/common/Spinner.tsx
// The one small "something is loading" ring. Used inside buttons, cards and
// modals. For full page / section loading use DbdSpinner instead.
import React from 'react';
import { cn } from '@/utils/cn';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type SpinnerTone = 'inverted' | 'accent' | 'amber' | 'current';

const SPINNER_SIZES: Record<SpinnerSize, string> = {
  xs: 'h-3.5 w-3.5 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
};

const SPINNER_TONES: Record<SpinnerTone, string> = {
  inverted: 'border-text-inverted border-t-transparent',
  accent: 'border-accent-red border-t-transparent',
  amber: 'border-accent-amber border-t-transparent',
  current: 'border-current border-t-transparent',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  className?: string;
  /** Accessible name. Omit when the spinner sits inside a labelled control. */
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'sm', tone = 'current', className, label }) => (
  <span
    {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
    className={cn(
      'inline-block shrink-0 animate-spin rounded-full',
      SPINNER_SIZES[size],
      SPINNER_TONES[tone],
      className
    )}
  />
);
