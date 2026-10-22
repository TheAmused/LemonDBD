'use client';
// frontend/src/components/common/SegmentedControl.tsx

import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/common/Tooltip';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  shortLabel?: string;
  icon?: React.ReactNode;
  /** Tailwind classes for the sliding thumb when this option is active. */
  activeClassName?: string;
  activeTextColor?: string;
  /**
   * Renders this option as a real link instead of a state button, so
   * navigation keeps native anchor semantics (ctrl/cmd-click, middle-click,
   * "open in new tab", and working without JS) for options that switch
   * pages rather than plain in-place state.
   */
  href?: string;
  /** Not selectable (e.g. a source that is not available yet). Pair with `tooltip` to say why. */
  disabled?: boolean;
  /** Optional richer hover/focus tooltip (title defaults to `label` if omitted). */
  tooltip?: { title?: string; description: string };
}

export type SegmentedOption<T extends string> = SegmentedControlOption<T>;

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  variant?: 'pill' | 'underline';
  /** Backwards compatibility alias for variant="underline" */
  bare?: boolean;
  className?: string;
}

const DEFAULT_THUMB = 'bg-accent-red text-text-inverted';

export function resolveActiveIndex<T extends string>(
  value: T,
  options: readonly SegmentedControlOption<T>[]
): number {
  const index = options.findIndex((opt) => opt.value === value);
  return index === -1 ? 0 : index;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  variant = 'pill',
  bare = false,
  className,
}: SegmentedControlProps<T>) {
  const isUnderline = variant === 'underline' || bare;
  const activeIndex = resolveActiveIndex(value, options);

  // Below sm (640px) these run noticeably smaller than the desktop size --
  // a phone screen has no room to render every control at full desktop
  // scale even after wrapping onto its own line, so the controls
  // themselves shrink too, not just the layout around them.
  //
  // Above sm, padY only grows earlier (lg/xl) because vertical padding
  // doesn't cost row width -- it makes the pill visibly taller/bigger on a
  // 1440px screen for free. textSize and horizontal padding (below) DO cost
  // row width, and PerkFilters' whole row (5 of these + a search box) is
  // already tight enough at ~1440px-1536px that growing those earlier
  // pushes the search box onto its own line again -- so real horizontal
  // growth waits until `wide` (1800px), where there's plainly enough spare
  // width for everything, search included, to grow together.
  const padY =
    size === 'sm'
      ? 'py-1 sm:py-1.5 lg:py-2 xl:py-2.5 wide:py-3'
      : 'py-1.5 sm:py-2 lg:py-2.5 xl:py-3 wide:py-3.5';
  const textSize =
    size === 'sm'
      ? 'type-strong-wide-sm'
      : 'type-strong-wide';

  // A fixed 50%-width thumb only lines up when both options render to the
  // same width -- as soon as one side is visibly longer, it undershoots and
  // crowds that side's text. Measuring the actual active button instead.
  const buttonRefs = useRef<(HTMLLabelElement | HTMLAnchorElement | null)[]>([]);
  // One radio group per control: arrow keys move between its options, as in any radio group.
  const groupName = useId();
  const [thumbRect, setThumbRect] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (isUnderline) return;
    const btn = buttonRefs.current[activeIndex];
    if (!btn) return;

    // A ResizeObserver (rather than depending on label/icon/size props)
    // catches every actual width change -- including ones a caller's own
    // re-render doesn't otherwise signal, like a count badge's digits
    // changing -- without re-measuring on unrelated re-renders.
    const measure = () => setThumbRect({ left: btn.offsetLeft, width: btn.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(btn);
    return () => observer.disconnect();
  }, [activeIndex, isUnderline]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        isUnderline
          ? 'grid grid-cols-5 w-full lg:flex lg:w-auto items-center gap-0.5 sm:gap-1.5 p-1 rounded-card bg-bg-surface/90 border border-border-color/60 shadow-xs backdrop-blur-md'
          : 'relative inline-flex shrink-0 min-w-0 select-none items-stretch rounded-card border border-border-color bg-bg-elevated p-1 shadow-inner',
        className
      )}
    >
      {!isUnderline && (
        <span
          aria-hidden="true"
          style={thumbRect ? { left: thumbRect.left, width: thumbRect.width } : undefined}
          className={cn(
            'absolute inset-y-1 rounded-control shadow-md transition-[left,width] duration-200 ease-out',
            !thumbRect && 'opacity-0',
            options[activeIndex]?.activeClassName || DEFAULT_THUMB
          )}
        />
      )}
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        const activeTextClass = opt.activeTextColor || (isUnderline ? 'text-accent-red' : 'text-text-inverted');
        const optionClassName = isUnderline
          ? cn(
              'relative flex items-center justify-center gap-1 sm:gap-1.5 2xl:gap-2.5 type-strong-wide-caps transition-all duration-200 cursor-pointer touch-manipulation min-h-9 sm:min-h-hit 2xl:min-h-12 select-none text-center pb-1.5 pt-1 px-0.5 sm:px-2 2xl:px-3.5 2xl:py-2 wide:px-4.5 rounded-control transition-colors',
              isActive ? 'text-accent-red' : 'text-text-primary hover:text-accent-red hover:bg-bg-elevated/60'
            )
          : cn(
              'relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1 sm:gap-1.5 wide:gap-2 whitespace-nowrap pointer-coarse:min-h-11 rounded-control px-2 sm:px-3 wide:px-4 wide-2k:px-5 transition-colors duration-200',
              padY,
              textSize,
              isActive ? activeTextClass : opt.disabled ? 'cursor-not-allowed text-text-muted opacity-60' : 'text-text-primary hover:text-accent-red'
            );

        const content = (
          <>
            {opt.icon}
            <span className={opt.shortLabel ? 'hidden sm:inline whitespace-nowrap' : 'whitespace-nowrap'}>
              {opt.label}
            </span>
            {opt.shortLabel && <span className="inline sm:hidden whitespace-nowrap">{opt.shortLabel}</span>}
            {isUnderline && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 bottom-0 h-indicator rounded-full bg-accent-red transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            )}
          </>
        );

        let element: React.ReactNode;
        if (opt.href) {
          element = (
            <Link
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              href={opt.href}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(opt.value)}
              className={optionClassName}
            >
              {content}
            </Link>
          );
        } else {
          element = (
            <label
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              className={cn(optionClassName, 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-red')}
            >
              <input
                type="radio"
                className="sr-only"
                name={groupName}
                value={opt.value}
                checked={isActive}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
              />
              {content}
            </label>
          );
        }

        if (opt.tooltip) {
          const tooltipTitle =
            opt.tooltip.title || (typeof opt.label === 'string' ? opt.label : opt.shortLabel || '');
          return (
            <Tooltip
              key={opt.value}
              variant="action"
              title={tooltipTitle}
              description={opt.tooltip.description}
            >
              {element}
            </Tooltip>
          );
        }

        return element;
      })}
    </div>
  );
}
