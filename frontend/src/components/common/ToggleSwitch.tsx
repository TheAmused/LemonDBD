'use client';
// frontend/src/components/common/ToggleSwitch.tsx

import React from 'react';
import { cn } from '@/utils/cn';

export interface ToggleSwitchOption<T extends string> {
  value: T;
  /** Visible label. Omit for an icon-only option -- pass `ariaLabel`
   * instead so the icon stays perfectly centered (a hidden label span
   * still counts as a flex item and skews `gap`-based centering even at
   * zero width). */
  label?: React.ReactNode;
  icon?: React.ReactNode;
  /** Accessible name for this option. Required when `label` is omitted;
   * otherwise defaults to the visible label's text content. */
  ariaLabel?: string;
  /** Tailwind classes for the sliding thumb when this option is active. */
  activeClassName?: string;
  activeTextColor?: string;
}

export interface ToggleSwitchProps<T extends string> {
  value: T;
  options: readonly [ToggleSwitchOption<T>, ToggleSwitchOption<T>];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
  /** Both options are icon-only (no `label`) -- renders each as a fixed
   * square button instead of `size`'s proportional padding, so the icon
   * sits dead-center instead of being pulled off-center by asymmetric
   * horizontal/vertical padding. */
  iconOnly?: boolean;
}

const DEFAULT_THUMB = 'bg-accent-amber text-text-inverted';

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
  iconOnly = false,
}: ToggleSwitchProps<T>) {
  const [left, right] = options;
  const activeIndex = resolveActiveIndex(value, options);
  const padY = size === 'sm' ? 'py-1.5' : 'py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 min-w-0 select-none items-stretch rounded-full border border-border-color bg-bg-primary p-1 shadow-inner',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-md transition-transform duration-200 ease-out',
          activeIndex === 1 ? 'translate-x-full' : 'translate-x-0',
          (activeIndex === 1 ? right.activeClassName : left.activeClassName) || DEFAULT_THUMB
        )}
      />
      {options.map((opt) => {
        const isActive = value === opt.value;
        const activeTextClass = opt.activeTextColor || 'text-text-inverted';
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-black transition-colors duration-200',
              iconOnly ? 'h-9 w-9' : 'flex-1 px-3',
              !iconOnly && padY,
              textSize,
              isActive ? activeTextClass : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {opt.icon}
            {opt.label != null && <span className="whitespace-nowrap">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

