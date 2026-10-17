'use client';
// frontend/src/components/ui/DiamondSlot.tsx
// Standardized 45-degree diamond slot container for DBD perks and items.

import React from 'react';
import { cn } from '@/utils/cn';
import { TileButton } from '@/components/common/TileButton';

export type DiamondSlotSize = 'sm' | 'md' | 'lg' | 'compact' | 'small' | 'large';

/**
 * Clips the hit area so the overlapping squares of neighbouring rows never steal each other's clicks.
 */
export const DIAMOND_CLIP = 'polygon(43% 0, 57% 0, 100% 43%, 100% 57%, 57% 100%, 43% 100%, 0 57%, 0 43%)';

export interface DiamondSlotProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  size?: DiamondSlotSize | number;
  active?: boolean;
  glow?: boolean;
  dashed?: boolean;
  roleAccent?: 'Survivor' | 'Killer';
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-10 h-10 sm:w-11 sm:h-11',
  small: 'w-11 h-11 xl:w-16 xl:h-16',
  compact: 'w-10 h-10 xl:w-12 xl:h-12',
  md: 'w-14 h-14 sm:w-16 sm:h-16',
  lg: 'w-11 h-11 sm:w-14 sm:h-14 xl:w-18 xl:h-18',
  large: 'w-11 h-11 sm:w-14 sm:h-14 xl:w-18 xl:h-18',
};

export const DiamondSlot = React.forwardRef<HTMLElement, DiamondSlotProps>(function DiamondSlot(
  {
    size = 'md',
    active = false,
    glow = false,
    dashed = false,
    roleAccent,
    onClick,
    children,
    className,
    innerClassName,
    ariaLabel,
    ...rest
  },
  ref
) {
  const isNumberSize = typeof size === 'number';
  const sizeClass = isNumberSize ? '' : SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const style = isNumberSize ? { width: size, height: size } : undefined;

  const roleBorder =
    roleAccent === 'Survivor'
      ? 'border-accent-green/80 hover:border-accent-green'
      : roleAccent === 'Killer'
      ? 'border-accent-red/80 hover:border-accent-red'
      : active
      ? 'border-accent-red/80 hover:border-accent-red'
      : dashed
      ? 'border-dashed border-border-color bg-bg-elevated/40 hover:border-accent-amber/60 hover:bg-accent-amber/5'
      : 'border-border-color bg-bg-elevated/40';

  const glowEffect = glow
    ? roleAccent === 'Survivor'
      ? 'shadow-glow-green-soft'
      : 'shadow-glow-red-soft'
    : '';

  if (onClick) {
    return (
      <TileButton
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        aria-label={ariaLabel}
        style={style}
        className={cn(
          'relative flex shrink-0 items-center justify-center rotate-45 rounded-control border-2 transition-all shadow-md',
          sizeClass,
          roleBorder,
          glowEffect,
          className
        )}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <div
          className={cn(
            '-rotate-45 relative flex items-center justify-center w-full h-full pointer-events-none',
            innerClassName
          )}
        >
          {children}
        </div>
      </TileButton>
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      aria-label={ariaLabel}
      style={style}
      className={cn(
        'relative flex shrink-0 items-center justify-center rotate-45 rounded-card border-2 transition-all shadow-md',
        sizeClass,
        roleBorder,
        glowEffect,
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          '-rotate-45 relative flex items-center justify-center w-full h-full pointer-events-none',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
});
