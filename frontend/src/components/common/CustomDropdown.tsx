'use client';
// frontend/src/components/common/CustomDropdown.tsx

import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface CustomDropdownProps<T extends string = string> {
  /**
   * The classic mode: a single-select listbox. value/onChange/options stay
   * required together for that mode, so every existing caller is
   * unaffected -- pass `children` instead for the newer "arbitrary panel
   * content" mode described below.
   */
  value?: T;
  onChange?: (value: T) => void;
  options?: DropdownOption<T>[];
  /**
   * Static trigger text, for when the button isn't showing "the selected
   * option" (there may be no single value at all, e.g. a settings panel
   * with several independent controls inside). Falls back to the selected
   * option's label when omitted, so existing callers see no change.
   */
  label?: React.ReactNode;
  /**
   * Arbitrary content for the panel instead of the built-in options
   * listbox -- e.g. a stack of unrelated toggles. When provided, `options`
   * is ignored for rendering (existing behavior for callers that don't
   * pass it is untouched). The open/close mechanics (outside click,
   * Escape, animation) are shared with the listbox mode.
   */
  children?: React.ReactNode;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  minWidthClass?: string;
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  label,
  children,
  icon,
  ariaLabel,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  minWidthClass = 'min-w-[160px]',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options?.find((o) => o.value === value) || options?.[0];
  const triggerLabel = label ?? selectedOption?.label;
  const triggerIcon = icon || selectedOption?.icon;

  // The menu is portaled, so `w-full` would mean viewport width: map it to the trigger width.
  const resolvedMenuClassName = menuClassName.replace(/(^|\s)w-full(?=\s|$)/g, '$1w-[var(--popover-anchor-width)]');

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optValue: T) => {
      onChange?.(optValue);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        {...popoverTriggerProps(isOpen, children ? 'true' : 'listbox')}
        aria-label={ariaLabel || (typeof triggerLabel === 'string' ? triggerLabel : undefined)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-border-color hover:border-accent-amber/50 hover:bg-bg-elevated text-xs font-bold text-text-primary transition-all cursor-pointer shadow-xs select-none ${
          isOpen ? 'border-accent-amber bg-accent-amber/10 text-accent-amber shadow-xs' : ''
        } ${buttonClassName}`}
      >
        {triggerIcon && (
          <span className="text-text-secondary shrink-0">{triggerIcon}</span>
        )}
        {triggerLabel != null && <span className="truncate">{triggerLabel}</span>}
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-secondary transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-accent-amber' : ''
          }`}
        />
      </button>

      <Popover
        open={isOpen}
        anchorRef={containerRef}
        onClose={() => setIsOpen(false)}
        align={align === 'right' ? 'end' : 'start'}
        gap={6}
        maxHeight={typeof window !== 'undefined' ? window.innerHeight * 0.7 : undefined}
        role={children ? 'group' : 'listbox'}
        ariaLabel={children ? (ariaLabel || (typeof triggerLabel === 'string' ? triggerLabel : undefined)) : undefined}
        className={`${minWidthClass} rounded-2xl bg-bg-surface border border-border-color p-1.5 shadow-xl backdrop-blur-2xl custom-scrollbar ${resolvedMenuClassName}`}
      >
            {children
              ? children
              : (options ?? []).map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-accent-amber text-text-inverted font-black shadow-xs'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-tiny text-text-muted font-normal truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3] ml-2 shrink-0" />}
                    </button>
                  );
                })}
      </Popover>
    </div>
  );
}

