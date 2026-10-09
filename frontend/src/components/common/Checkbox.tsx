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
  /** Failed validation: red ring + aria-invalid. The page shows the message (like Field's error row). */
  invalid?: boolean;
  /** Id of the element that explains the error. */
  ariaDescribedBy?: string;
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
  invalid,
  ariaDescribedBy,
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
      aria-invalid={invalid || undefined}
      aria-describedby={ariaDescribedBy}
      aria-label={children ? undefined : ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
      className={cn('h-4 w-4 shrink-0 cursor-[inherit] rounded border-border-color accent-accent-red aria-invalid:ring-2 aria-invalid:ring-accent-red', invalid && 'ring-2 ring-accent-red', boxClassName)}
    />
    {children}
  </label>
);
