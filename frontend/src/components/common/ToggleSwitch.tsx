'use client';
// frontend/src/components/common/ToggleSwitch.tsx

import React from 'react';
import { cn } from '@/utils/cn';

export interface ToggleSwitchOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
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
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-black transition-colors duration-200',
              padY,
              textSize,
              isActive ? activeTextClass : 'text-text-secondary hover:text-text-primary'
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

