'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/common/Tooltip';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
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
   * state -- just bare tabs with an amber underline on the active one. Used
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
        'flex items-center overflow-x-auto',
        bare ? 'gap-3' : 'gap-1 rounded-2xl bg-slate-900/50 p-1 shadow-inner',
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
              'relative flex shrink-0 items-center gap-1.5 text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer touch-manipulation min-h-[40px] sm:min-h-[44px]',
              bare
                ? cn('pb-1.5 pt-1 px-1', isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300')
                : cn(
                    'rounded-xl px-3 py-2',
                    isActive ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-100'
                  )
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {bare && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-amber-400 transition-opacity duration-200',
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
