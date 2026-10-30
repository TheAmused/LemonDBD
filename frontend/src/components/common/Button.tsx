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
  | 'amberSoft' // tinted amber (amber/10), the amber twin of `soft`
  | 'link' //    amber text link, no box (hover underline)
  | 'linkMuted' // quiet text link, for secondary "back" and "change" actions
  | 'linkDanger' // red text link, for "reset" and "remove" actions
  | 'greenSoft' // tinted green (green/10), the green twin of `soft`
  | 'ghostDanger' // no box, red text, red tint on hover (clear, remove)
  | 'onAccent' // on a coloured banner: a translucent white tint that keeps the banner's text colour
  | 'overlay' //  frosted square-ish control laid over a thumbnail (remove, edit); turns red on hover
  | 'cta'; //     loud DBD randomizer CTA

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-red text-text-inverted shadow-sm hover:bg-accent-red-hover',
  secondary: 'border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  soft: 'border border-accent-red/40 bg-accent-red/15 text-accent-red hover:bg-accent-red/25',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  danger: 'border border-accent-red/40 bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-text-inverted',
  success: 'bg-accent-green text-text-inverted shadow-sm hover:brightness-110',
  amber: 'bg-accent-amber text-text-inverted shadow-sm hover:bg-accent-amber-hover',
  amberSoft: 'border border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20',
  link: 'text-accent-amber underline-offset-2 hover:underline',
  linkMuted: 'text-text-muted underline-offset-2 hover:text-text-primary hover:underline',
  linkDanger: 'text-accent-red underline-offset-2 hover:underline',
  greenSoft: 'border border-accent-green/40 bg-accent-green/10 text-accent-green hover:bg-accent-green/20',
  ghostDanger: 'text-accent-red hover:bg-accent-red/10',
  onAccent: 'bg-text-inverted/20 text-inherit hover:bg-text-inverted/30',
  overlay: 'border border-border-color/60 bg-bg-surface/90 text-text-muted shadow-xs backdrop-blur-sm hover:bg-accent-red hover:text-text-inverted',
  cta: 'bg-accent-red text-text-inverted font-black uppercase tracking-wider shadow-xs hover:bg-accent-red-hover hover:scale-[1.02] hover:shadow-md hover:shadow-accent-red/40 active:scale-[0.97]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'gap-1 px-2.5 py-1 text-mini pointer-coarse:min-h-11',
  sm: 'gap-1.5 px-3 py-1.5 text-xs pointer-coarse:min-h-11',
  md: 'gap-2 px-4 py-2.5 text-sm pointer-coarse:min-h-11',
  lg: 'gap-2 px-6 py-3 text-base',
};

const isLinkVariant = (v: ButtonVariant) => v === 'link' || v === 'linkMuted' || v === 'linkDanger';

// Links carry no box: size only sets the text size.
const LINK_SIZES: Record<ButtonSize, string> = {
  xs: 'gap-1 text-mini',
  sm: 'gap-1 text-xs',
  md: 'gap-1.5 text-sm',
  lg: 'gap-1.5 text-base',
};

const CTA_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  lg: 'gap-2 px-6 py-3.5 text-sm sm:gap-3 sm:px-10 sm:py-4 sm:text-base xl:gap-3.5 xl:px-12 xl:py-4.5 xl:text-lg 2xl:gap-4 2xl:px-14 2xl:py-5 2xl:text-xl wide:gap-4.5 wide:px-16 wide:py-5.5 wide:text-2xl wide-2k:gap-5 wide-2k:px-20 wide-2k:py-6 wide-2k:text-2xl',
  md: 'gap-2 px-5 py-3 text-xs sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-sm xl:gap-3 xl:px-10 xl:py-4 xl:text-base 2xl:px-12 2xl:py-4.5 2xl:text-lg',
  sm: 'gap-1.5 px-4 py-2.5 text-mini sm:gap-2 sm:px-6 sm:py-3 sm:text-xs xl:px-7 xl:py-3 xl:text-sm',
};

// pointer-coarse: icon-only buttons grow to the 44px touch minimum on phones and tablets.
const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 w-6 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  sm: 'h-8 w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  md: 'h-10 w-10 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  lg: 'h-12 w-12',
};

// The size an icon placed straight inside the button takes (see `.button-icons-*` in base.css).
// An icon that sets its own size keeps it: use that only for a deliberately larger icon.
const ICON_SIZES: Record<ButtonSize, string> = { xs: 'button-icons-sm', sm: 'button-icons-md', md: 'button-icons-lg', lg: 'button-icons-lg' };
const LABEL_ICON_SIZES: Record<ButtonSize, string> = { xs: 'button-icons-sm', sm: 'button-icons-sm', md: 'button-icons-md', lg: 'button-icons-md' };

/** The icon-size class for a button-like control of this size; ToggleChip shares it so both size icons alike. */
export const buttonIconSizeClass = (size: ButtonSize, iconOnly: boolean): string => (iconOnly ? ICON_SIZES : LABEL_ICON_SIZES)[size];

// An overlay control sits on a thumbnail: it keeps its small look and grows only an invisible hit area on touch screens.
const OVERLAY_TOUCH = 'hit-area pointer-coarse:min-h-0 pointer-coarse:min-w-0';

const ROLE_RING: Record<DbdButtonRole, string> = {
  Survivor: 'focus-visible:ring-accent-green',
  Killer: 'focus-visible:ring-accent-red',
};

const BUTTON_BASE =
  'inline-flex max-w-full shrink-0 items-center justify-center font-bold transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50';

/** The one corner radius of a Button. Callers never set their own: `pill` is the only alternative. */
const BUTTON_RADIUS = 'rounded-control';
const BUTTON_RADIUS_PILL = 'rounded-full';

/** The class list of a Button, for the rare spot that needs a link (<a>/<Link>) that looks like one. */
export function buttonClassName(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  const sizes = isLinkVariant(variant) ? LINK_SIZES[size] : BUTTON_SIZES[size];
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], sizes, BUTTON_RADIUS, className);
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Role-based ring color tint ('Survivor' -> green, 'Killer' -> red). */
  roleAccent?: DbdButtonRole;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  /** While `loading`, show only the spinner (centred, the label keeps the button's width) instead of spinner plus label. */
  spinnerOnly?: boolean;
  /** Icon before the label. */
  leftIcon?: React.ReactNode;
  /** Icon after the label. */
  rightIcon?: React.ReactNode;
  /** Square, icon-only button. Requires `aria-label`. */
  icon?: boolean;
  pill?: boolean;
  dashed?: boolean;
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
    spinnerOnly = false,
    leftIcon,
    rightIcon,
    icon = false,
    fit = true,
    pill = false,
    dashed = false,
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
    : isLinkVariant(variant)
    ? LINK_SIZES[size]
    : BUTTON_SIZES[size];
  const ringClass = roleAccent ? ROLE_RING[roleAccent] : undefined;
  const spinnerReplacesLabel = loading && spinnerOnly;
  const spinner = <Spinner size={size === 'lg' ? 'sm' : 'xs'} tone={spinnerTone} />;
  const label =
    fit && !icon && (typeof children === 'string' || typeof children === 'number') ? (
      <FitText minScale={0.7} maxLines={2}>{children}</FitText>
    ) : (
      children
    );

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
        pill ? BUTTON_RADIUS_PILL : BUTTON_RADIUS,
        dashed && 'border-dashed',
        variant === 'overlay' && OVERLAY_TOUCH,
        spinnerReplacesLabel && 'relative',
        ringClass,
        variant !== 'cta' && buttonIconSizeClass(size, icon),
        className
      )}
      {...rest}
    >
      {spinnerReplacesLabel ? (
        <>
          <span className="inline-flex items-center gap-[inherit] opacity-0">
            {leftIcon}
            {label}
            {rightIcon}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">{spinner}</span>
        </>
      ) : (
        <>
          {loading ? spinner : leftIcon}
          {label}
          {!loading && rightIcon}
        </>
      )}
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
