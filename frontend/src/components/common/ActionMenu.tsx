'use client';
// frontend/src/components/common/ActionMenu.tsx
// The "⋯" button that opens a short menu of actions on one thing (a table row, a card). Items that
// do not apply are left out by the caller; a destructive item is marked `danger` and listed last.
import React, { useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Button, type ButtonSize } from '@/components/common/Button';
import { MenuItem } from '@/components/common/MenuItem';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';
import { cn } from '@/utils/cn';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  /** Names the trigger for screen readers ("Actions for lemon"). */
  label: string;
  items: readonly ActionMenuItem[];
  size?: ButtonSize;
  className?: string;
}

export function ActionMenu({ label, items, size = 'sm', className }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (items.length === 0) return null;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="secondary"
        size={size}
        icon
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={className}
        {...popoverTriggerProps(open, 'menu')}
      >
        <Ellipsis className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Popover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        align="end"
        role="menu"
        ariaLabel={label}
        className="min-w-[13rem] rounded-card border border-border-color bg-bg-surface p-1.5 shadow-xl"
      >
        {items.map((item) => (
          <MenuItem
            key={item.key}
            role="menuitem"
            disabled={item.disabled}
            className={cn(item.danger && 'text-accent-red hover:text-accent-red')}
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </MenuItem>
        ))}
      </Popover>
    </>
  );
}
