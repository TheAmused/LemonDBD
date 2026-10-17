// frontend/src/components/common/IconTile.tsx
// A square tile with one icon in it: the mark above a title in empty states, gates, section heads and
// result screens. One shape, three sizes, an accent tone.
import React from 'react';
import { cn } from '@/utils/cn';

export type IconTileSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconTileTone = 'neutral' | 'red' | 'amber' | 'green';

const SIZES: Record<IconTileSize, string> = {
  // The small tile beside a section heading; its corners are a control's, not a card's.
  xs: 'h-9 w-9 rounded-control',
  sm: 'h-10 w-10 rounded-card',
  md: 'h-12 w-12 rounded-card',
  lg: 'h-16 w-16 rounded-card',
};
const TONES: Record<IconTileTone, string> = {
  neutral: 'border-border-color bg-bg-elevated text-text-secondary',
  red: 'border-accent-red/30 bg-accent-red/10 text-accent-red',
  amber: 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
  green: 'border-accent-green/30 bg-accent-green/10 text-accent-green',
};

export interface IconTileProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: IconTileSize;
  tone?: IconTileTone;
}

export function IconTile({ size = 'md', tone = 'red', className, children, ...rest }: IconTileProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center border', SIZES[size], TONES[tone], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
