// frontend/src/components/common/ToggleChip.tsx
// A button that is on or off (filter chip, option picker, toolbar toggle). One look: bordered
// surface when off, tinted accent when on. Mutually exclusive choices that share one frame belong in
// SegmentedControl; one-off actions in Button.
import React from 'react';
import { cn } from '@/utils/cn';

export type ToggleChipSize = 'xs' | 'sm' | 'md';
export type ToggleChipTone = 'red' | 'amber';

const ON: Record<ToggleChipTone, string> = {
  red: 'border-accent-red/50 bg-accent-red/10 text-accent-red hover:bg-accent-red/15',
  amber: 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/15',
};
const OFF = 'border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary';

const SIZES: Record<ToggleChipSize, string> = {
  xs: 'gap-1 px-2.5 py-1 text-mini pointer-coarse:min-h-11',
  sm: 'gap-1.5 px-3 py-1.5 text-xs pointer-coarse:min-h-11',
  md: 'min-h-hit-sm gap-2 px-3.5 py-2 text-xs sm:text-sm pointer-coarse:min-h-11',
};
// Square, icon-only toggle. Phones and tablets get the 44px touch minimum.
const ICON_SIZES: Record<ToggleChipSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  md: 'h-10 w-10 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
};

export interface ToggleChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-pressed'> {
  pressed: boolean;
  size?: ToggleChipSize;
  tone?: ToggleChipTone;
  pill?: boolean;
  /** Square, icon-only toggle. Requires `aria-label`. */
  icon?: boolean;
}

export const ToggleChip = React.forwardRef<HTMLButtonElement, ToggleChipProps>(function ToggleChip(
  { pressed, size = 'md', tone = 'red', pill = false, icon = false, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex shrink-0 items-center justify-center border font-bold transition-colors cursor-pointer select-none touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50',
        pill ? 'rounded-full' : 'rounded-control',
        icon ? ICON_SIZES[size] : SIZES[size],
        pressed ? ON[tone] : OFF,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
