// frontend/src/components/common/MenuItem.tsx
// One row of a dropdown, popover menu or listbox. Selected rows get the accent tint, the rest hover.
// Inside a menu that clips its corners (overflow-hidden) pass `flush` so the rows stay square.
import React from 'react';
import { cn } from '@/utils/cn';

export type MenuItemTone = 'red' | 'amber' | 'green';

const SELECTED: Record<MenuItemTone, string> = {
  red: 'bg-accent-red/15 text-accent-red',
  amber: 'bg-accent-amber/15 text-accent-amber',
  green: 'bg-accent-green/15 text-accent-green',
};
const IDLE = 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary';

/** The classes of a menu row, for the rare row that has to be a link (<a>/<Link>) instead of a button. */
export function menuItemClassName({ selected = false, tone = 'red', flush = false, className }: { selected?: boolean; tone?: MenuItemTone; flush?: boolean; className?: string } = {}): string {
  return cn(
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer pointer-coarse:min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50',
    flush ? 'rounded-none' : 'rounded-control',
    selected ? SELECTED[tone] : IDLE,
    className
  );
}

export interface MenuItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** The current choice: `aria-selected` on a role="option" row, `aria-current` on a plain one. */
  selected?: boolean;
  tone?: MenuItemTone;
  flush?: boolean;
}

export const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { selected = false, tone = 'red', flush = false, className, children, role, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-selected={role === 'option' ? selected : undefined}
      aria-current={role !== 'option' && selected ? 'true' : undefined}
      className={menuItemClassName({ selected, tone, flush, className })}
      {...rest}
    >
      {children}
    </button>
  );
});
