// frontend/src/components/character-detail/components/CollapsibleDrawer.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible } from '@/components/common/Collapsible';

interface CollapsibleDrawerProps {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode: pass both so the parent owns (and can persist) the open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerClassName?: string;
  bodyClassName?: string;
}

/**
 * Wraps a section's header so clicking it collapses/expands the body below.
 * Used for the large item/add-on grids so they can be tucked away instead of
 * always forcing a long scroll, especially on small screens.
 *
 * The body folds through the shared <Collapsible>. It lets content spill out once fully open
 * (`overflowWhenOpen`), so a CategoryPicker dropdown opening upward is not clipped.
 */
export const CollapsibleDrawer: React.FC<CollapsibleDrawerProps> = ({
  header,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  headerClassName = '',
  bodyClassName = '',
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const toggle = () => {
    const next = !open;
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setUncontrolledOpen(next);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`w-full flex items-center justify-center gap-3 text-left cursor-pointer group ${headerClassName}`}
      >
        {header}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted group-hover:text-text-primary transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <Collapsible open={open} overflowWhenOpen contentClassName={`min-h-0 ${bodyClassName}`}>
        {children}
      </Collapsible>
    </>
  );
};
