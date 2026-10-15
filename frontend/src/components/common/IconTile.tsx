// frontend/src/components/common/IconTile.tsx
// A square tile with one icon in it: the mark above a title in empty states, gates, section heads and
// result screens. One shape, three sizes, an accent tone.
import React from 'react';
import { cn } from '@/utils/cn';

export type IconTileSize = 'sm' | 'md' | 'lg';
export type IconTileTone = 'red' | 'amber' | 'green';

const SIZES: Record<IconTileSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};
const TONES: Record<IconTileTone, string> = {
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
      className={cn('flex shrink-0 items-center justify-center rounded-card border', SIZES[size], TONES[tone], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
