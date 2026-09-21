// frontend/src/components/character-detail/components/CollapsibleDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
 * Animated via the CSS grid-template-rows 0fr/1fr trick instead of
 * mounting/unmounting the body, since the body's height is dynamic
 * (image grids) and can't be pre-computed for a max-height transition.
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

  // Only true once fully open AND the opening transition has finished.
  // `overflow-hidden` has to stay on while closed/animating so the content
  // doesn't spill out of a shorter-than-content row, but it also clips any
  // descendant that deliberately renders outside this box — e.g. a
  // CategoryPicker dropdown opening upward. Lifting it once settled lets
  // that escape correctly without breaking the collapse animation itself.
  const [settled, setSettled] = useState(open);

  useEffect(() => {
    if (!open) setSettled(false);
  }, [open]);

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
        className={`w-full flex items-center justify-between gap-3 text-left cursor-pointer group ${headerClassName}`}
      >
        {header}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted group-hover:text-text-primary transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === 'grid-template-rows' && open) setSettled(true);
        }}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className={settled ? 'overflow-visible' : 'overflow-hidden'}>
          <div
            aria-hidden={!open}
            className={`min-h-0 transition-opacity duration-300 ${open ? 'opacity-100 delay-100' : 'opacity-0'} ${bodyClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
