// frontend/src/components/common/ColorSwatch.tsx
// A colour you can pick: a square swatch with a check when it is the current choice. The fill comes
// from `className` (a tier colour token class) or from the rainbow of the custom colour picker.
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ColorSwatchSize = 'sm' | 'md';

const SIZES: Record<ColorSwatchSize, string> = {
  sm: 'h-7 w-7 rounded-chip pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  md: 'h-11 w-11 rounded-control',
};

export interface ColorSwatchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-pressed'> {
  selected: boolean;
  size?: ColorSwatchSize;
  /** Replaces the default check mark shown when selected. */
  mark?: React.ReactNode;
}

export const ColorSwatch = React.forwardRef<HTMLButtonElement, ColorSwatchProps>(function ColorSwatch(
  { selected, size = 'md', mark, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center border-2 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red',
        SIZES[size],
        selected ? 'border-text-primary' : 'border-transparent',
        className
      )}
      {...rest}
    >
      {selected && (mark ?? <Check className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />)}
      {children}
    </button>
  );
});
