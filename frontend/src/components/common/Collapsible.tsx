'use client';
// frontend/src/components/common/Collapsible.tsx
// The body that folds away under a header: one animation (height via grid-template-rows 0fr to 1fr,
// which `height: auto` cannot do), one fade, and `inert` while closed so hidden controls are neither
// focusable nor read out. Every collapsible section in the app moves through this component.
import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

export interface CollapsibleProps {
  open: boolean;
  children: React.ReactNode;
  /** Classes of the animated wrapper (e.g. margin). */
  className?: string;
  /** Classes of the content box inside it (padding, border, spacing). */
  contentClassName?: string;
  /**
   * Let content spill out of the box once fully open, for a menu that opens past the edge of the
   * section. While closed or animating the box still clips.
   */
  overflowWhenOpen?: boolean;
}

export function Collapsible({ open, children, className, contentClassName, overflowWhenOpen = false }: CollapsibleProps) {
  // True once fully open AND the opening transition has finished.
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) setSettled(false);
  }, [open]);

  return (
    <div
      inert={!open}
      onTransitionEnd={(e) => {
        if (overflowWhenOpen && e.propertyName === 'grid-template-rows' && open) setSettled(true);
      }}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className
      )}
    >
      <div className={overflowWhenOpen && settled ? 'overflow-visible' : 'overflow-hidden'}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
