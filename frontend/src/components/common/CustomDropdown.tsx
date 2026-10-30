'use client';
// frontend/src/components/common/CustomDropdown.tsx

import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { MENU_PANEL_CLASS, Popover, popoverTriggerProps } from '@/components/common/Popover';
import { cn } from '@/utils/cn';
import { MenuItem } from '@/components/common/MenuItem';
import { Badge } from '@/components/common/Badge';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export type DropdownAccent = 'amber' | 'primary';

// Full class strings so Tailwind can see them; `primary` is the site's red.
const ACCENT_CLASSES: Record<DropdownAccent, { hover: string; open: string; chevron: string }> = {
  amber: {
    hover: 'hover:border-accent-amber/50',
    open: 'border-accent-amber bg-accent-amber/10 text-accent-amber',
    chevron: 'text-accent-amber',
  },
  primary: {
    hover: 'hover:border-accent-red/50',
    open: 'border-accent-red bg-accent-red/10 text-accent-red',
    chevron: 'text-accent-red',
  },
};

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
   * The multi-select variant: pass `values` + `onValuesChange` (with
   * `options` and a static `label`) instead of value/onChange. Options toggle
   * on click, the panel stays open, and the trigger shows how many are chosen.
   */
  values?: readonly T[];
  onValuesChange?: (values: T[]) => void;
  /** Multi-select: text of a last row that empties the selection (shown while something is chosen). */
  clearLabel?: string;
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
  accent?: DropdownAccent;
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  values,
  onValuesChange,
  clearLabel,
  label,
  children,
  icon,
  ariaLabel,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  minWidthClass = 'min-w-40',
  accent = 'amber',
}: CustomDropdownProps<T>) {
  const accentClasses = ACCENT_CLASSES[accent];
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const multiple = values !== undefined && onValuesChange !== undefined;
  const selectedOption = multiple ? undefined : options?.find((o) => o.value === value) || options?.[0];
  const triggerLabel = label ?? selectedOption?.label;
  const triggerIcon = icon || selectedOption?.icon;

  // The menu is portaled, so `w-full` would mean viewport width: map it to the trigger width.
  const resolvedMenuClassName = menuClassName.replace(/(^|\s)w-full(?=\s|$)/g, '$1w-[var(--popover-anchor-width)]');

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (optValue: T) => {
      if (values !== undefined && onValuesChange) {
        // Toggle, keeping the options' order; the panel stays open for the next pick.
        const next = values.includes(optValue) ? values.filter((v) => v !== optValue) : [...values, optValue];
        onValuesChange((options ?? []).map((o) => o.value).filter((v) => next.includes(v)));
        return;
      }
      onChange?.(optValue);
      setIsOpen(false);
    },
    [onChange, values, onValuesChange, options]
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        {...popoverTriggerProps(isOpen, children || multiple ? 'true' : false)}
        aria-label={ariaLabel || (typeof triggerLabel === 'string' ? triggerLabel : undefined)}
        className={`flex items-center gap-2 px-3 py-2 pointer-coarse:min-h-11 rounded-control bg-bg-surface border border-border-color ${accentClasses.hover} hover:bg-bg-elevated text-xs font-bold text-text-primary transition-all cursor-pointer shadow-xs select-none ${
          isOpen ? `${accentClasses.open} shadow-xs` : ''
        } ${buttonClassName}`}
      >
        {triggerIcon && (
          <span className="text-text-secondary shrink-0">{triggerIcon}</span>
        )}
        {triggerLabel != null && <span className="truncate">{triggerLabel}</span>}
        {multiple && values.length > 0 && (
          <Badge tone={accent === 'amber' ? 'amber' : 'red'} size="xs" plain>
            {values.length}
          </Badge>
        )}
        <ChevronDown
          className={`icon-sm text-text-secondary transition-transform duration-200 shrink-0 ${
            isOpen ? `rotate-180 ${accentClasses.chevron}` : ''
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
        role={children ? 'group' : undefined}
        as={multiple ? 'fieldset' : undefined}
        ariaLabel={children || multiple ? (ariaLabel || (typeof triggerLabel === 'string' ? triggerLabel : undefined)) : undefined}
        className={cn(MENU_PANEL_CLASS, minWidthClass, 'custom-scrollbar', resolvedMenuClassName)}
      >
            {children
              ? children
              : (options ?? []).map((opt) => {
                  const isSelected = multiple ? values.includes(opt.value) : opt.value === value;
                  return (
                    <MenuItem selected={isSelected} tone={accent === 'amber' ? 'amber' : 'red'} className="justify-between"
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      {...(multiple ? { 'aria-pressed': isSelected, 'aria-current': undefined } : {})}
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
                      {isSelected && <Check className="icon-sm stroke-[3] ml-2 shrink-0" />}
                    </MenuItem>
                  );
                })}
            {!children && multiple && clearLabel && values.length > 0 && (
              <MenuItem className="mt-1 justify-center border-t border-border-color text-text-muted" onClick={() => onValuesChange([])}>
                {clearLabel}
              </MenuItem>
            )}
      </Popover>
    </div>
  );
}

