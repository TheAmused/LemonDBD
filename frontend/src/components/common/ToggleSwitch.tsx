'use client';
// frontend/src/components/common/ToggleSwitch.tsx

import React, { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/utils/cn';

export interface ToggleSwitchOption<T extends string> {
  value: T;
  label: React.ReactNode;
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
}

export interface ToggleSwitchProps<T extends string> {
  value: T;
  options: readonly ToggleSwitchOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

const DEFAULT_THUMB = 'bg-accent-red text-text-inverted';

export function resolveActiveIndex<T extends string>(
  value: T,
  options: readonly ToggleSwitchOption<T>[]
): number {
  const index = options.findIndex((opt) => opt.value === value);
  return index === -1 ? 0 : index;
}

export function ToggleSwitch<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: ToggleSwitchProps<T>) {
  const activeIndex = resolveActiveIndex(value, options);
  const padY = size === 'sm' ? 'py-1.5' : 'py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  // A fixed 50%-width thumb only lines up when both options render to the
  // same width -- as soon as one side is visibly longer, it undershoots and
  // crowds that side's text. Measuring the actual active button instead.
  const buttonRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
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
          !thumbRect && 'opacity-0',
          options[activeIndex]?.activeClassName || DEFAULT_THUMB
        )}
      />
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        const activeTextClass = opt.activeTextColor || 'text-text-inverted';
        const optionClassName = cn(
          'relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-black transition-colors duration-200',
          padY,
          textSize,
          isActive ? activeTextClass : 'text-text-secondary hover:text-text-primary'
        );

        if (opt.href) {
          return (
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
              {opt.icon}
              <span className="whitespace-nowrap">{opt.label}</span>
            </Link>
          );
        }

        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={optionClassName}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

