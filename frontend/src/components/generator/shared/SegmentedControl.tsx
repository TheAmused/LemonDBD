// frontend/src/components/generator/shared/SegmentedControl.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/common/Tooltip';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  /** Optional richer hover/focus tooltip (title defaults to `label` if omitted). */
  tooltip?: { title?: string; description: string };
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  /** Drops the pill-container background/padding and the filled-pill active
   * state -- just bare tabs with a red underline on the active one. Used
   * where the control has to float directly over a stage/view instead of
   * sitting in its own banner bar. */
  bare?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  bare = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-5 w-full lg:flex lg:w-auto items-center',
        bare ? 'gap-0.5 sm:gap-1.5 p-1 rounded-2xl bg-bg-surface/90 border border-border-color/60 shadow-xs backdrop-blur-md' : 'gap-1 rounded-2xl bg-bg-elevated p-1 shadow-inner border border-border-color',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const button = (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              'relative flex items-center justify-center gap-1 sm:gap-1.5 2xl:gap-2.5 text-[10px] xs:text-[11px] sm:text-xs 2xl:text-sm min-[1800px]:text-base font-black tracking-wide sm:tracking-wider uppercase transition-all duration-200 cursor-pointer touch-manipulation min-h-[36px] sm:min-h-[42px] 2xl:min-h-[48px] select-none text-center',
              bare
                ? cn('pb-1.5 pt-1 px-0.5 sm:px-2 2xl:px-3.5 2xl:py-2 min-[1800px]:px-4.5', isActive ? 'text-accent-red font-extrabold' : 'text-text-secondary hover:text-text-primary')
                : cn(
                    'rounded-xl px-2 sm:px-3 2xl:px-4 py-1.5 sm:py-2 2xl:py-2.5',
                    isActive ? 'bg-accent-red text-text-inverted shadow-xs' : 'text-text-secondary hover:text-text-primary'
                  )
            )}
          >
            {opt.icon}
            <span className={opt.shortLabel ? 'hidden sm:inline' : ''}>{opt.label}</span>
            {opt.shortLabel && <span className="inline sm:hidden">{opt.shortLabel}</span>}
            {bare && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-accent-red transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            )}
          </button>
        );

        if (!opt.tooltip) return button;

        return (
          <Tooltip key={opt.value} title={opt.tooltip.title || opt.label} description={opt.tooltip.description}>
            {button}
          </Tooltip>
        );
      })}
    </div>
  );
}
