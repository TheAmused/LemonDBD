// frontend/src/components/common/TileButton.tsx
// The behaviour every picture-or-card button shares: pointer cursor, a visible keyboard focus ring and a
// small press feedback (grows on hover, shrinks when pressed). The look of the tile (frame, background,
// colour) is the caller's; a tile that must not grow passes `press={false}`.
import React from 'react';
import { cn } from '@/utils/cn';

export interface TileButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  press?: boolean;
}

export const TileButton = React.forwardRef<HTMLButtonElement, TileButtonProps>(function TileButton(
  { press = true, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'cursor-pointer transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed',
        press && 'hover:scale-105 active:scale-95',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
