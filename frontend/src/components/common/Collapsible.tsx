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
  /**
   * Fold only on screens narrower than `sm`; from `sm` up the wrapper dissolves (`display: contents`) so
   * the children join the parent's layout and are always shown. Closed content is hidden with
   * `visibility`, not `inert`, because `inert` cannot be limited to a width.
   */
  onlyBelow?: 'sm';
}

export function Collapsible({ open, children, className, contentClassName, overflowWhenOpen = false, onlyBelow }: CollapsibleProps) {
  // True once fully open AND the opening transition has finished.
  const [settled, setSettled] = useState(open);
  useEffect(() => {
    if (!open) setSettled(false);
  }, [open]);

  return (
    <div
      inert={onlyBelow ? undefined : !open}
      onTransitionEnd={(e) => {
        if (overflowWhenOpen && e.propertyName === 'grid-template-rows' && open) setSettled(true);
      }}
      className={cn(
        onlyBelow
          ? 'sm:contents max-sm:grid max-sm:transition-[grid-template-rows,opacity,margin,visibility] max-sm:duration-300 max-sm:ease-in-out motion-reduce:transition-none'
          : 'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        onlyBelow
          ? open
            ? 'max-sm:grid-rows-[1fr] max-sm:opacity-100'
            : 'max-sm:invisible max-sm:-mt-2 max-sm:grid-rows-[0fr] max-sm:opacity-0'
          : open
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0',
        className
      )}
    >
      <div className={cn(overflowWhenOpen && settled ? 'overflow-visible' : 'overflow-hidden', onlyBelow && 'min-h-0 sm:contents')}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}
