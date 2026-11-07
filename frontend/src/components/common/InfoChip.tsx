// frontend/src/components/common/InfoChip.tsx
//
// The one NON-clickable label ("Base game", "Oct 2024", "Licensed"). Flat, borderless, small
// corners, no hover -- the opposite of a clickable capsule (see common/LinkPill).
// InfoChipButton is its clickable twin for a row that mixes both (Read lore next to its facts): the
// same box in every respect, so a row reads as one set; only the arrow its caller adds and the hover mark it as clickable.
import React from 'react';
import { cn } from '@/utils/cn';

const CHIP_BASE = 'inline-flex items-center gap-1.5 rounded-chip bg-bg-elevated/60 px-2.5 py-1.5 text-text-secondary type-strong select-none';

export function InfoChip({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(CHIP_BASE, 'cursor-default', className)} {...rest}>
      {children}
    </span>
  );
}

/** A chip that does something when pressed. Put a trailing arrow in `children` to say so. */
export function InfoChipButton({
  children,
  className,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        CHIP_BASE,
        'cursor-pointer transition-colors hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red pointer-coarse:min-h-11',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
