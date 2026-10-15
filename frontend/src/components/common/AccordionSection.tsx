'use client';
// frontend/src/components/common/AccordionSection.tsx
// A bordered section whose header folds the body away: centered title, accent chevron, an optional
// banner image behind the header and an optional action beside the chevron. The caller owns the open
// state (useState, usePersistentDrawer), so remembering it stays the caller's decision.
//
// The toggle is a button laid over the whole header, so an action (a real button) can sit in the
// header without nesting one button inside another.
import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';

export interface AccordionSectionProps {
  title: React.ReactNode;
  /** DOM id of the heading, for `aria-labelledby` on the section. */
  titleId?: string;
  open: boolean;
  onToggle: () => void;
  /** Accessible name of the toggle when the visible title is not enough (default: the title text). */
  toggleLabel?: string;
  /** Image path behind the header. Gives the header its taller, atmospheric look. */
  banner?: string;
  /** Shown right after the title (a count Badge). */
  badge?: React.ReactNode;
  /** Shown inside the title line, e.g. an unread dot. */
  titleAddon?: React.ReactNode;
  /** A control in the header, left of the chevron (it stays clickable on its own). */
  headerAction?: React.ReactNode;
  as?: 'section' | 'div';
  className?: string;
  /** Padding and spacing of the body. */
  bodyClassName?: string;
  children: React.ReactNode;
}

const HEADER_TALL = 'py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 min-h-16 sm:min-h-18';
const HEADER_COMPACT = 'px-4 sm:px-6 py-3.5 sm:py-4';

export function AccordionSection({
  title,
  titleId,
  open,
  onToggle,
  toggleLabel,
  banner,
  badge,
  titleAddon,
  headerAction,
  as,
  className,
  bodyClassName = 'p-4 sm:p-6 2xl:p-7',
  children,
}: AccordionSectionProps) {
  const autoId = useId();
  const headingId = titleId ?? autoId;
  return (
    <Surface
      as={as}
      aria-labelledby={headingId}
      padding="none"
      className={cn('flex flex-col overflow-hidden transition-colors', banner ? 'backdrop-blur-xl shadow-md' : 'shadow-xs', className)}
    >
      <div className={cn('group relative grid w-full select-none grid-cols-[1fr_auto_1fr] items-center gap-2 overflow-hidden', banner ? HEADER_TALL : HEADER_COMPACT)}>
        {banner && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity filter transition-transform duration-700 ease-out group-hover:scale-105 dark:opacity-30"
              style={{ backgroundImage: `url('${banner}')` }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-color/60" />
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-labelledby={toggleLabel ? undefined : headingId}
          aria-label={toggleLabel}
          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
        />
        <div aria-hidden="true" />
        <div className="pointer-events-none relative z-10 flex min-w-0 items-center justify-center gap-2 px-2 text-center">
          <h2 id={headingId} className="relative inline-block type-section-title text-text-primary transition-colors group-hover:text-accent-red">
            {title}
            {titleAddon}
          </h2>
          {badge}
        </div>
        <div className="pointer-events-none relative z-10 flex shrink-0 items-center justify-end gap-3">
          {headerAction && <div className="pointer-events-auto">{headerAction}</div>}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 text-accent-red transition-transform duration-300 ease-in-out sm:h-5 sm:w-5',
              banner && '2xl:h-6 2xl:w-6',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className={cn('border-t border-border-color', bodyClassName)}>{children}</div>
        </div>
      </div>
    </Surface>
  );
}
