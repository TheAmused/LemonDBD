'use client';
// frontend/src/components/common/ToggleSwitch.tsx

import React, { useLayoutEffect, useRef, useState } from 'react';
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

  // A fixed 50%-width thumb only lines up when both options render to the
  // same width -- as soon as one side is visibly longer, it undershoots and
  // crowds that side's text. Measuring the actual active button instead.
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumbRect, setThumbRect] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
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
  }, [activeIndex]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 min-w-0 select-none items-stretch rounded-full border border-border-color bg-bg-elevated p-1 shadow-inner',
        className
      )}
    >
      <span
        aria-hidden="true"
        style={thumbRect ? { left: thumbRect.left, width: thumbRect.width } : undefined}
        className={cn(
          'absolute inset-y-1 rounded-full shadow-md transition-[left,width] duration-200 ease-out',
          !thumbRect && 'left-1 w-[calc(50%-4px)]',
          !thumbRect && (activeIndex === 1 ? 'translate-x-full' : 'translate-x-0'),
          (activeIndex === 1 ? right.activeClassName : left.activeClassName) || DEFAULT_THUMB
        )}
      />
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        const activeTextClass = opt.activeTextColor || 'text-text-inverted';
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
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

