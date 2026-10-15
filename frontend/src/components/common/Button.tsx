// frontend/src/components/common/Button.tsx
// The one button. Variants cover every recurring style; use className only for
// layout (width, margin, rounding) -- never to re-colour a variant.
import React from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/common/Spinner';
import { FitText } from '@/components/common/FitText';

export type DbdButtonRole = 'Survivor' | 'Killer';
export type DbdButtonSize = 'lg' | 'md' | 'sm';

export type ButtonVariant =
  | 'primary' //   solid red call to action
  | 'secondary' // bordered neutral surface
  | 'soft' //      tinted red (accent-red/10..20), for secondary calls to action
  | 'ghost' //     no background until hover
  | 'danger' //    destructive, outlined red
  | 'success' //   solid green
  | 'amber' //    solid amber, for amber-themed surfaces
  | 'cta'; //     loud DBD randomizer CTA

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-red text-text-inverted shadow-sm hover:bg-accent-red-hover',
  secondary: 'border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  soft: 'border border-accent-red/40 bg-accent-red/15 text-accent-red hover:bg-accent-red/25',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  danger: 'border border-accent-red/40 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-text-inverted',
  success: 'bg-accent-green text-text-inverted shadow-sm hover:brightness-110',
  amber: 'bg-accent-amber text-text-inverted shadow-sm hover:bg-accent-amber-hover',
  cta: 'bg-accent-red text-text-inverted font-black uppercase tracking-wider shadow-xs hover:bg-accent-red-hover hover:scale-[1.02] hover:shadow-md hover:shadow-accent-red/40 active:scale-[0.97]',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'gap-1 px-2.5 py-1 text-mini',
  sm: 'gap-1.5 px-3 py-1.5 text-xs',
  md: 'gap-2 px-4 py-2.5 text-sm',
  lg: 'gap-2 px-6 py-3 text-base',
};

const CTA_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  lg: 'gap-2 px-6 py-3.5 text-sm sm:gap-3 sm:px-10 sm:py-4 sm:text-base xl:gap-3.5 xl:px-12 xl:py-4.5 xl:text-lg 2xl:gap-4 2xl:px-14 2xl:py-5 2xl:text-xl wide:gap-4.5 wide:px-16 wide:py-5.5 wide:text-2xl wide-2k:gap-5 wide-2k:px-20 wide-2k:py-6 wide-2k:text-2xl',
  md: 'gap-2 px-5 py-3 text-xs sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-sm xl:gap-3 xl:px-10 xl:py-4 xl:text-base 2xl:px-12 2xl:py-4.5 2xl:text-lg',
  sm: 'gap-1.5 px-4 py-2.5 text-mini sm:gap-2 sm:px-6 sm:py-3 sm:text-xs xl:px-7 xl:py-3 xl:text-sm',
};

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const ROLE_RING: Record<DbdButtonRole, string> = {
  Survivor: 'focus-visible:ring-accent-green',
  Killer: 'focus-visible:ring-accent-red',
};

export const BUTTON_BASE =
  'inline-flex max-w-full shrink-0 items-center justify-center font-bold transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50';

/** The one corner radius of a Button. Callers never set their own: `pill` is the only alternative. */
export const BUTTON_RADIUS = 'rounded-control';
const BUTTON_RADIUS_PILL = 'rounded-full';

/** The class list of a Button, for the rare spot that needs a link (<a>/<Link>) that looks like one. */
export function buttonClassName(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], variant !== 'cta' && BUTTON_RADIUS, className);
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Role-based ring color tint ('Survivor' -> green, 'Killer' -> red). */
  roleAccent?: DbdButtonRole;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  /** Icon before the label. */
  leftIcon?: React.ReactNode;
  /** Icon after the label. */
  rightIcon?: React.ReactNode;
  /** Square, icon-only button. Requires `aria-label`. */
  icon?: boolean;
  /** Fully rounded ends instead of the standard control radius. */
  pill?: boolean;
  /** Shrink a plain-text label to fit a narrow button (default), or leave it alone. */
  fit?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    roleAccent,
    loading = false,
    leftIcon,
    rightIcon,
    icon = false,
    fit = true,
    pill = false,
    className,
    disabled,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  const spinnerTone = variant === 'primary' || variant === 'cta' || variant === 'success' || variant === 'amber' ? 'inverted' : 'current';
  const sizeClasses = icon
    ? ICON_BUTTON_SIZES[size]
    : variant === 'cta'
    ? CTA_SIZES[size === 'xs' ? 'sm' : size]
    : BUTTON_SIZES[size];
  const ringClass = roleAccent ? ROLE_RING[roleAccent] : undefined;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        sizeClasses,
        variant !== 'cta' && (pill ? BUTTON_RADIUS_PILL : BUTTON_RADIUS),
        ringClass,
        className
      )}
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

export interface DbdButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  role?: DbdButtonRole;
  roleAccent?: DbdButtonRole;
  size?: DbdButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

export const DbdButton = React.forwardRef<HTMLButtonElement, DbdButtonProps>(function DbdButton(
  { role, roleAccent, size = 'lg', icon, children, ...rest },
  ref
) {
  return (
    <Button
      ref={ref}
      variant="cta"
      roleAccent={roleAccent || role}
      size={size}
      leftIcon={icon}
      {...rest}
    >
      {children}
    </Button>
  );
});
