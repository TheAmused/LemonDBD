'use client';
// frontend/src/components/common/Tabs.tsx
// The one tab list. Tabs switch content panels (pair with <TabPanel>); for a
// plain value picker with no panels use SegmentedControl instead.

import React, { useEffect, useId, useRef } from 'react';
import { cn } from '@/utils/cn';

export type TabsVariant = 'underline' | 'pill' | 'boxed';
export type TabsSize = 'sm' | 'md' | 'lg';
export type TabAccent = 'red' | 'green';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Shown as "(n)" after the label. */
  count?: number | string;
  disabled?: boolean;
  /** Overrides the list-level accent for this tab's active state. */
  accent?: TabAccent;
  /** Extra props spread on the tab button (aria-label, tooltip props...). */
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: readonly TabItem<T>[];
  ariaLabel: string;
  variant?: TabsVariant;
  size?: TabsSize;
  accent?: TabAccent;
  orientation?: 'horizontal' | 'vertical';
  /** Tabs stretch to share the full width. */
  fullWidth?: boolean;
  /** Wrap onto several lines instead of scrolling horizontally. */
  wrap?: boolean;
  /** Center the tabs. */
  centered?: boolean;
  /** 'automatic' (default) selects on arrow-key focus; 'manual' needs Enter/Space. */
  activation?: 'automatic' | 'manual';
  /** Base for the tab/panel ids. Pass the same value to <TabPanel>. */
  idBase?: string;
  /** Set false when no <TabPanel> exists, so aria-controls is not dangling. */
  panels?: boolean;
  className?: string;
  /** Extra classes on every tab button (e.g. uppercase tracking). */
  tabClassName?: string;
}

const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'] as const;

/**
 * Pure WAI-ARIA keyboard navigation. Returns the index to move to, or -1 when
 * the key is not a navigation key (or no enabled tab exists). Wraps around and
 * skips disabled tabs.
 */
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
  disabled: readonly boolean[] = [],
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): number {
  if (count <= 0 || !(NAV_KEYS as readonly string[]).includes(key)) return -1;
  const isOff = (i: number) => !!disabled[i];
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  const scan = (start: number, step: 1 | -1): number => {
    for (let n = 0; n < count; n++) {
      const i = (((start + step * n) % count) + count) % count;
      if (!isOff(i)) return i;
    }
    return -1;
  };
  if (key === 'Home') return scan(0, 1);
  if (key === 'End') return scan(count - 1, -1);
  if (key === nextKey) return scan(current + 1, 1);
  if (key === prevKey) return scan(current - 1, -1);
  return -1;
}

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const panelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

const SIZES: Record<TabsSize, string> = {
  sm: 'gap-1 px-2.5 py-1 text-mini',
  md: 'gap-1.5 px-3 py-1.5 text-xs',
  lg: 'min-h-[48px] gap-2 px-4 py-2.5 text-xs',
};

const ACTIVE_TINT: Record<TabAccent, string> = {
  red: 'border-accent-red/40 bg-accent-red/15 text-accent-red',
  green: 'border-accent-green/40 bg-accent-green/15 text-accent-green',
};
const ACTIVE_UNDERLINE: Record<TabAccent, string> = {
  red: 'border-accent-red text-accent-red',
  green: 'border-accent-green text-accent-green',
};
const ACTIVE_SOLID: Record<TabAccent, string> = {
  red: 'bg-accent-red text-text-inverted shadow-xs',
  green: 'bg-accent-green text-text-inverted shadow-xs',
};

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel,
  variant = 'pill',
  size = 'md',
  accent = 'red',
  orientation = 'horizontal',
  fullWidth = false,
  wrap = false,
  centered = false,
  activation = 'automatic',
  idBase,
  panels = true,
  className,
  tabClassName,
}: TabsProps<T>) {
  const generated = useId();
  const base = idBase ?? generated;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const vertical = orientation === 'vertical';

  const activeIndex = tabs.findIndex((t) => t.value === value);
  // Roving tabindex: the active tab is the stop; fall back to the first enabled one.
  const firstEnabled = tabs.findIndex((t) => !t.disabled);
  const stopIndex = activeIndex !== -1 && !tabs[activeIndex].disabled ? activeIndex : firstEnabled;

  // Keep the active tab visible inside an overflow-scrolling list.
  useEffect(() => {
    if (wrap) return;
    refs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex, wrap]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const target = nextTabIndex(index, e.key, tabs.length, tabs.map((t) => !!t.disabled), orientation);
    if (target === -1) return;
    e.preventDefault();
    refs.current[target]?.focus();
    if (activation === 'automatic') onChange(tabs[target].value);
  };

  const listBase =
    variant === 'boxed'
      ? 'gap-1.5 rounded-lg border border-border-color bg-bg-primary/50 p-1'
      : variant === 'underline'
        ? vertical
          ? 'gap-1 border-l border-border-color'
          : 'gap-1 border-b border-border-color'
        : 'gap-2';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={cn(
        'flex items-center select-none',
        vertical ? 'flex-col items-stretch' : wrap ? 'flex-wrap' : 'max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        centered && !vertical && 'justify-center',
        !fullWidth && !vertical && variant === 'boxed' && 'w-fit',
        listBase,
        className
      )}
    >
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        const tabAccent = tab.accent ?? accent;
        const { className: extraClass, ...restButtonProps } = (tab.buttonProps ?? {}) as { className?: string };
        const variantClass =
          variant === 'underline'
            ? cn('rounded-t-md border-b-2 -mb-px', isActive ? ACTIVE_UNDERLINE[tabAccent] : 'border-transparent text-text-secondary hover:text-text-primary')
            : variant === 'boxed'
              ? cn('rounded-md', isActive ? ACTIVE_SOLID[tabAccent] : 'text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary')
              : cn(
                  size === 'sm' ? 'rounded-lg' : 'rounded-xl',
                  'border',
                  isActive
                    ? cn(ACTIVE_TINT[tabAccent], 'shadow-xs')
                    : 'border-transparent bg-bg-elevated text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                );
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(base, tab.value)}
            aria-selected={isActive}
            aria-controls={panels ? panelId(base, tab.value) : undefined}
            tabIndex={i === stopIndex ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            {...restButtonProps}
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50',
              SIZES[size],
              fullWidth && 'flex-1',
              variantClass,
              tabClassName,
              extraClass
            )}
          >
            {tab.icon}
            <span>
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  /** The tab value this panel belongs to. */
  value: string;
  /** The tab value currently selected; the panel renders only when equal. */
  activeValue: string;
  /** Same idBase given to <Tabs>. */
  idBase: string;
  className?: string;
  children?: React.ReactNode;
}

export function TabPanel({ value, activeValue, idBase, className, children }: TabPanelProps) {
  if (value !== activeValue) return null;
  return (
    <div role="tabpanel" id={panelId(idBase, value)} aria-labelledby={tabId(idBase, value)} tabIndex={0} className={cn('focus:outline-none', className)}>
      {children}
    </div>
  );
}
