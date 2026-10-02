// frontend/src/components/common/Field.tsx
// Text inputs, textareas, selects and search boxes with ONE focus / error /
// disabled style. Checkbox lives in Checkbox.tsx, switches in Switch.tsx.
import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export type FieldSize = 'sm' | 'md' | 'lg';

export const FIELD_BASE =
  'w-full border border-border-color bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 disabled:cursor-not-allowed disabled:opacity-50';
export const FIELD_ERROR = 'border-accent-red focus:ring-accent-red';
// 16px on small screens stops iOS Safari from zooming into focused inputs.
export const FIELD_SIZES: Record<FieldSize, string> = {
  sm: 'rounded-lg px-2.5 py-1.5 text-base sm:text-xs',
  md: 'rounded-xl px-3 py-2.5 text-base sm:text-sm',
  lg: 'rounded-xl px-4 py-3 text-base',
};

interface CommonFieldProps {
  fieldSize?: FieldSize;
  invalid?: boolean;
}

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & CommonFieldProps;
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { fieldSize = 'md', invalid, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], invalid && FIELD_ERROR, className)}
      {...rest}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & CommonFieldProps;
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { fieldSize = 'md', invalid, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], 'resize-y', invalid && FIELD_ERROR, className)}
      {...rest}
    />
  );
});

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & CommonFieldProps;
/** Native select for short, simple lists. Use CustomDropdown for rich options. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { fieldSize = 'md', invalid, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], 'cursor-pointer', invalid && FIELD_ERROR, className)}
      {...rest}
    >
      {children}
    </select>
  );
});

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Class for the wrapper (width / margin). */
  wrapperClassName?: string;
}
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { wrapperClassName, className, fieldSize = 'md', ...rest },
  ref
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input ref={ref} type="search" fieldSize={fieldSize} className={cn('pl-9', className)} {...rest} />
    </div>
  );
});

/** Label + control + hint/error row. */
export const FieldLabel: React.FC<{
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, error, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block type-strong text-text-secondary">
      {label}
    </label>
    {children}
    {error ? (
      <p role="alert" className="text-xs font-medium text-accent-red">
        {error}
      </p>
    ) : (
      hint && <p className="text-xs text-text-muted">{hint}</p>
    )}
  </div>
);
