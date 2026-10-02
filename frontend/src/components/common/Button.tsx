// frontend/src/components/common/Button.tsx
// The one button. Variants cover every recurring style; use className only for
// layout (width, margin, rounding) -- never to re-colour a variant.
import React from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/common/Spinner';
import { FitText } from '@/components/common/FitText';

export type ButtonVariant =
  | 'primary' //   solid red call to action
  | 'secondary' // bordered neutral surface
  | 'soft' //      tinted red (accent-red/10..20), for secondary calls to action
  | 'ghost' //     no background until hover
  | 'danger' //    destructive, outlined red
  | 'success'; //  solid green
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-red text-text-inverted shadow-sm hover:bg-accent-red-hover',
  secondary: 'border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  soft: 'border border-accent-red/40 bg-accent-red/15 text-accent-red hover:bg-accent-red/25',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  danger: 'border border-accent-red/40 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-text-inverted',
  success: 'bg-accent-green text-text-inverted shadow-sm hover:brightness-110',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'gap-1 rounded-lg px-2.5 py-1 text-mini',
  sm: 'gap-1.5 rounded-lg px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-xl px-4 py-2.5 text-sm',
  lg: 'gap-2 rounded-xl px-6 py-3 text-base',
};

export const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 w-6 rounded-lg',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-xl',
};

export const BUTTON_BASE =
  'inline-flex max-w-full shrink-0 items-center justify-center font-bold transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50';

/** The class list of a Button, for the rare spot that needs a link (<a>/<Link>) that looks like one. */
export function buttonClassName(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  /** Icon before the label. */
  leftIcon?: React.ReactNode;
  /** Icon after the label. */
  rightIcon?: React.ReactNode;
  /** Square, icon-only button. Requires `aria-label`. */
  icon?: boolean;
  /** Shrink a plain-text label to fit a narrow button (default), or leave it alone. */
  fit?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    icon = false,
    fit = true,
    className,
    disabled,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  const spinnerTone = variant === 'primary' || variant === 'success' ? 'inverted' : 'current';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], icon ? ICON_BUTTON_SIZES[size] : BUTTON_SIZES[size], className)}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 'sm' : 'xs'} tone={spinnerTone} /> : leftIcon}
      {fit && !icon && (typeof children === 'string' || typeof children === 'number') ? (
        <FitText minScale={0.7} maxLines={2}>{children}</FitText>
      ) : (
        children
      )}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
