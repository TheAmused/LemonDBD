'use client';
// frontend/src/components/generator/shared/DbdButton.tsx
//
// Shared primary-action button for the Perk Randomizer's draw/confirm CTAs --
// Pull the Lever, Spin for Perk Slot, Roll, Shuffle & Draw, Crack Open the
// Crate, Confirm Selection, Draw Again.
//
// Built on the same shared convention as every other primary button on the
// site (AuthModal's submit button, UserProfileForm's save button, etc.): a
// solid accent-red fill, rounded-xl corners, white uppercase text. The role
// accent (Survivor/Killer) survives only as a thin focus-ring tint, not a
// whole separate shape or color scheme.
import React from 'react';
import { cn } from '@/utils/cn';

export type DbdButtonRole = 'Survivor' | 'Killer';
export type DbdButtonSize = 'lg' | 'md' | 'sm';

export interface DbdButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  role: DbdButtonRole;
  size?: DbdButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

// Padding/type scale steps down on small screens instead of using one fixed
// desktop-sized value everywhere -- a fixed px-10/py-5 "lg" button alone
// could run wider than a narrow phone viewport once its icon + label text
// were accounted for.
const SIZE_STYLES: Record<DbdButtonSize, string> = {
  lg: 'gap-2 px-6 py-3.5 text-sm sm:gap-3 sm:px-10 sm:py-4 sm:text-base',
  md: 'gap-2 px-5 py-3 text-xs sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-sm',
  sm: 'gap-1.5 px-4 py-2.5 text-[11px] sm:gap-2 sm:px-6 sm:py-3 sm:text-xs',
};

const ICON_SIZE: Record<DbdButtonSize, string> = {
  lg: 'h-5 w-5 sm:h-6 sm:w-6',
  md: 'h-4 w-4 sm:h-5 sm:w-5',
  sm: 'h-4 w-4',
};

// Role identity lives only in the focus ring tint -- Survivor green, Killer
// red -- instead of a differently-shaped panel.
const ROLE_RING: Record<DbdButtonRole, string> = {
  Survivor: 'focus-visible:ring-accent-green',
  Killer: 'focus-visible:ring-accent-red',
};

export const DbdButton = React.forwardRef<HTMLButtonElement, DbdButtonProps>(function DbdButton(
  { role, size = 'lg', icon, children, onClick, disabled, type = 'button', className, ...rest },
  ref
) {
  const active = !disabled;

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-black uppercase tracking-wider text-white transition-all duration-200 focus:outline-none focus-visible:ring-2',
        SIZE_STYLES[size],
        ROLE_RING[role],
        active
          ? 'cursor-pointer bg-accent-red shadow-xs hover:bg-accent-red-hover active:scale-[0.97]'
          : 'cursor-not-allowed bg-bg-elevated text-text-muted opacity-60',
        className
      )}
    >
      <span className={cn('inline-flex items-center', size === 'sm' ? 'gap-1.5' : size === 'md' ? 'gap-2' : 'gap-2 sm:gap-2.5')}>
        {icon && <span className={cn('shrink-0', ICON_SIZE[size])}>{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  );
});
