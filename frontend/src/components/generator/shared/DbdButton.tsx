'use client';
// frontend/src/components/generator/shared/DbdButton.tsx
//
// Shared primary-action button for the Perk Randomizer's draw/confirm CTAs --
// Pull the Lever, Spin for Perk Slot, Roll, Shuffle & Draw, Crack Open the
// Crate, Confirm Selection, Draw Again. Styled to actually sit inside this
// app's existing HUD language instead of floating on top of it: a dark
// bevelled panel that matches the page's near-black background, an amber
// bezel (the same accent already used for the active mode tab, the active
// PerkSlot ring, and a locked slot-machine reel), a thin role-tinted
// underline for Survivor/Killer identity, and a restrained hover sweep +
// idle glow instead of a loud gradient block.

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
  /** Idle ambient glow pulse. Default true; ignored while disabled. */
  pulse?: boolean;
}

const SIZE_STYLES: Record<DbdButtonSize, string> = {
  lg: 'gap-3 px-10 py-5 text-base sm:text-lg',
  md: 'gap-2.5 px-8 py-4 text-sm',
  sm: 'gap-2 px-6 py-3 text-xs',
};

const CONTENT_GAP: Record<DbdButtonSize, string> = {
  lg: 'gap-3',
  md: 'gap-2.5',
  sm: 'gap-2',
};

const ICON_SIZE: Record<DbdButtonSize, string> = {
  lg: 'h-6 w-6',
  md: 'h-5 w-5',
  sm: 'h-4 w-4',
};

const ROLE_BAR: Record<DbdButtonRole, string> = {
  Survivor: 'from-emerald-500/0 via-emerald-400 to-emerald-500/0',
  Killer: 'from-rose-500/0 via-rose-500 to-rose-500/0',
};

// Angular "trial panel" notch on the top-left and bottom-right corners --
// echoes the rotated-diamond perk icons already used throughout this app,
// instead of a generic rounded-rect button.
const NOTCH = '[clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]';

export const DbdButton = React.forwardRef<HTMLButtonElement, DbdButtonProps>(function DbdButton(
  { role, size = 'lg', icon, children, onClick, disabled, type = 'button', className, pulse = true, ...rest },
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
        'group/dbdbtn relative isolate flex items-center justify-center font-black uppercase tracking-wider transition-transform duration-200',
        SIZE_STYLES[size],
        active ? cn('cursor-pointer active:scale-[0.97]', pulse && 'dbd-btn-pulse') : 'cursor-not-allowed',
        className
      )}
    >
      {/* Bordered + clipped panel: border + fill share one box so the amber
          bezel follows the notch cut cleanly instead of needing a second
          inset layer. */}
      <span
        className={cn(
          'absolute inset-0 -z-10 overflow-hidden border-[1.5px]',
          NOTCH,
          active
            ? 'border-amber-500/50 bg-gradient-to-b from-[#181d28] to-[#0a0c11]'
            : 'border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950'
        )}
      >
        <span className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_9px)]" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/40" />
        <span className={cn('pointer-events-none absolute inset-x-3 top-0 h-px', active ? 'bg-amber-200/25' : 'bg-white/5')} />
        {active && (
          <span className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r', ROLE_BAR[role])} />
        )}
        {active && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-amber-200/25 to-transparent opacity-0',
              'transition-[transform,opacity] duration-700 ease-out -translate-x-[160%] -skew-x-[20deg]',
              'group-hover/dbdbtn:translate-x-[420%] group-hover/dbdbtn:opacity-100'
            )}
          />
        )}
      </span>

      <span className={cn('relative z-10 flex items-center', CONTENT_GAP[size])}>
        {icon && <span className={cn('shrink-0', ICON_SIZE[size], active ? 'text-amber-400' : 'text-slate-600')}>{icon}</span>}
        <span className={active ? 'text-white' : 'text-slate-500'}>{children}</span>
      </span>
    </button>
  );
});
