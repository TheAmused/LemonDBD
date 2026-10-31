// frontend/src/components/common/Surface.tsx
// The one bordered box. Pick a tone on purpose:
//   flat     page-level panel   (bg-surface + border)
//   elevated raised card        (bg-elevated + border)
//   inset    a tint INSIDE a flat/elevated surface (bg-primary, no extra border depth)
//   well     a bordered, recessed box INSIDE a surface or a modal: a preview, a quoted text, a history entry
// Never nest a bordered Surface directly in a Modal body -- modals are already
// a surface; render the content directly.
import React from 'react';
import { cn } from '@/utils/cn';

export type SurfaceTone = 'flat' | 'elevated' | 'inset' | 'well' | 'dashed';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
/** card for panels; control for a small tile that sits in a row with buttons and fields; chip for a small picture frame. */
export type SurfaceRadius = 'card' | 'control' | 'chip';

const SURFACE_TONES: Record<SurfaceTone, string> = {
  flat: 'border border-border-color bg-bg-surface',
  elevated: 'border border-border-color bg-bg-elevated',
  inset: 'bg-bg-primary/60',
  well: 'border border-border-subtle bg-bg-primary',
  dashed: 'border border-dashed border-border-color bg-bg-surface/40',
};
const SURFACE_RADIUS: Record<SurfaceRadius, string> = {
  card: 'rounded-card',
  control: 'rounded-control',
  chip: 'rounded-chip',
};
const SURFACE_PADDING: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  radius?: SurfaceRadius;
  /** `output` for a live status message (its implicit role is status). */
  as?: 'div' | 'section' | 'article' | 'aside' | 'li' | 'output';
  /** Below `sm` the box drops its corners and its top and side borders: a full-width strip under a header bar. */
  stripOnPhone?: boolean;
}

/** The Surface look for an element that is not a div (<ul>, <pre>): same tones, same radius. */
export function surfaceClassName(tone: SurfaceTone = 'flat', padding: SurfacePadding = 'md', radius: SurfaceRadius = 'card'): string {
  return cn(SURFACE_TONES[tone], SURFACE_PADDING[padding], SURFACE_RADIUS[radius]);
}

export const Surface: React.FC<SurfaceProps> = ({
  tone = 'flat',
  padding = 'md',
  radius = 'card',
  as: Tag = 'div',
  stripOnPhone = false,
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      surfaceClassName(tone, padding, radius),
      stripOnPhone && 'max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0',
      className
    )}
    {...rest}
  >
    {children}
  </Tag>
);
