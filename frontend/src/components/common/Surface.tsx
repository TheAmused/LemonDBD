// frontend/src/components/common/Surface.tsx
// The one bordered box. Pick a tone on purpose:
//   flat     page-level panel   (bg-surface + border)
//   elevated raised card        (bg-elevated + border)
//   inset    a well INSIDE a flat/elevated surface (bg-primary, no extra border depth)
// Never nest a bordered Surface directly in a Modal body -- modals are already
// a surface; render the content directly.
import React from 'react';
import { cn } from '@/utils/cn';

export type SurfaceTone = 'flat' | 'elevated' | 'inset' | 'dashed';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
export type SurfaceRadius = 'lg' | 'xl' | '2xl' | '3xl';

const SURFACE_TONES: Record<SurfaceTone, string> = {
  flat: 'border border-border-color bg-bg-surface',
  elevated: 'border border-border-color bg-bg-elevated',
  inset: 'bg-bg-primary/60',
  dashed: 'border border-dashed border-border-color bg-bg-surface/40',
};
const SURFACE_PADDING: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};
const SURFACE_RADIUS: Record<SurfaceRadius, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  radius?: SurfaceRadius;
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
}

export const Surface: React.FC<SurfaceProps> = ({
  tone = 'flat',
  padding = 'md',
  radius = '2xl',
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => (
  <Tag className={cn(SURFACE_TONES[tone], SURFACE_PADDING[padding], SURFACE_RADIUS[radius], className)} {...rest}>
    {children}
  </Tag>
);
