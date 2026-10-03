// frontend/src/components/common/Checkbox.tsx
// The one labelled checkbox. Use Switch for instant on/off settings, Checkbox
// for "include this" style form fields.
import React from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Label content. Omit and pass `ariaLabel` for a bare box. */
  children?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Classes for the box itself (size overrides). */
  boxClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  children,
  ariaLabel,
  disabled,
  id,
  className,
  boxClassName,
}) => (
  <label
    className={cn(
      'inline-flex items-center gap-2 select-none',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      className
    )}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={children ? undefined : ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
      className={cn('h-4 w-4 shrink-0 cursor-[inherit] rounded border-border-color accent-accent-red', boxClassName)}
    />
    {children}
  </label>
);
