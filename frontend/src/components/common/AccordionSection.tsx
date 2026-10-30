'use client';
// frontend/src/components/common/AccordionSection.tsx
// A bordered section whose header folds the body away: centered title, accent chevron, an optional
// banner image behind the header and optional actions beside the chevron. The caller owns the open
// state (useState, usePersistentDrawer), so remembering it stays the caller's decision.
//
// The toggle is a button laid over the whole header, so actions (real buttons) can sit in the header
// without nesting one button inside another.
import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible } from '@/components/common/Collapsible';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';

export interface AccordionSectionProps {
  title: React.ReactNode;
  titleId?: string;
  open: boolean;
  onToggle: () => void;
  /** Accessible name of the toggle when the visible title is not enough (default: the title text). */
  toggleLabel?: string;
  /** Image path behind the header. Gives the header its taller, atmospheric look. */
  banner?: string;
  badge?: React.ReactNode;
  /** Shown inside the title line, e.g. an unread dot. */
  titleAddon?: React.ReactNode;
  /** Controls in the header, left of the chevron (they stay clickable on their own). */
  headerAction?: React.ReactNode;
  /**
   * The header stays pinned while the section scrolls (it clears the mobile top bar on phones).
   * The section then cannot clip (`overflow-hidden` would stop `sticky`), so the header rounds itself.
   */
  stickyHeader?: boolean;
  as?: 'section' | 'div';
  className?: string;
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
  stickyHeader = false,
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
      className={cn(
        'flex flex-col transition-colors',
        !stickyHeader && 'overflow-hidden',
        banner ? 'backdrop-blur-xl shadow-md' : 'shadow-xs',
        className
      )}
    >
      <div
        className={cn(
          'group relative flex w-full select-none flex-wrap items-center justify-between gap-3 overflow-hidden',
          banner ? HEADER_TALL : HEADER_COMPACT,
          stickyHeader && ['sticky top-16 z-20 lg:top-0', open ? 'rounded-t-card' : 'rounded-card']
        )}
      >
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
        {/* Left spacer: balances the right side so the title stays centered. */}
        <div aria-hidden="true" className="pointer-events-none relative z-10 hidden w-8 sm:block lg:w-auto lg:flex-1 lg:basis-0" />
        <div className="pointer-events-none relative z-10 min-w-0 flex-1 px-2 text-center lg:flex-none">
          <div className="inline-flex items-center justify-center gap-2">
            <h2 id={headingId} className="relative inline-block type-section-title text-text-primary transition-colors group-hover:text-accent-red">
              {title}
              {titleAddon}
            </h2>
            {badge}
          </div>
        </div>
        <div className="pointer-events-none relative z-10 flex shrink-0 items-center justify-end gap-3 lg:flex-1 lg:basis-0">
          {headerAction && <div className="pointer-events-auto">{headerAction}</div>}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'icon-md shrink-0 text-accent-red transition-transform duration-300 ease-in-out sm:icon-lg',
              banner && '2xl:icon-xl',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </div>

      <Collapsible open={open} contentClassName={cn('border-t border-border-color', bodyClassName)}>
        {children}
      </Collapsible>
    </Surface>
  );
}
