'use client';
// frontend/src/components/common/ToggleSwitch.tsx
//
// A real two-sided switch: one pill-shaped track with a sliding highlight
// behind two labels, instead of two separate buttons sitting side by side.
// Either label is clickable on its own (so a precise click still lands
// exactly where you'd expect), but the whole thing also reads and behaves
// like a single control -- there's one sliding thumb, and clicking whichever
// side isn't currently active slides it over, left or right.

import React from 'react';
import { cn } from '@/utils/cn';

export interface ToggleSwitchOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Tailwind classes for the sliding thumb when this option is active. */
  activeClassName?: string;
}

export interface ToggleSwitchProps<T extends string> {
  value: T;
  /** Exactly two options: [left, right]. */
  options: readonly [ToggleSwitchOption<T>, ToggleSwitchOption<T>];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

const DEFAULT_THUMB = 'bg-gradient-to-r from-slate-700 to-slate-800';

/** Pure "which side is active" resolver, pulled out of the component body
 * so it's unit-testable without rendering anything: 0 when `value` matches
 * the left option, 1 when it matches the right option (or neither -- the
 * thumb still has to rest somewhere, so an unmatched value falls back to
 * the left side rather than being undefined). */
export function resolveActiveIndex<T extends string>(
  value: T,
  options: readonly [ToggleSwitchOption<T>, ToggleSwitchOption<T>]
): 0 | 1 {
  return value === options[1].value ? 1 : 0;
}

export function ToggleSwitch<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: ToggleSwitchProps<T>) {
  const [left, right] = options;
  const activeIndex = resolveActiveIndex(value, options);
  const padY = size === 'sm' ? 'py-1.5' : 'py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    // Intrinsically sized (no forced w-full / min-width here) -- the track
    // is exactly as wide as its longer label needs to be, in whatever
    // language that turns out to be. A fixed minimum width is what forced
    // "Posiadane" (Polish for "Owned") to truncate into "Posiada..." even
    // though English "Owned" fit fine at that same width.
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 min-w-0 select-none items-stretch rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner dark:border-slate-800/80 dark:bg-slate-950/80',
        className
      )}
    >
      {/* The sliding thumb -- one element, animated between the two halves,
          instead of each button carrying its own "active" background. This
          is what makes it read as one switch rather than two buttons. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-md transition-transform duration-200 ease-out',
          activeIndex === 1 ? 'translate-x-full' : 'translate-x-0',
          (activeIndex === 1 ? right.activeClassName : left.activeClassName) || DEFAULT_THUMB
        )}
      />
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-black transition-colors duration-200',
              padY,
              textSize,
              isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
