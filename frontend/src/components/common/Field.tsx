// frontend/src/components/common/Field.tsx
// Text inputs, textareas, selects and search boxes with ONE focus / error /
// disabled style. Checkbox lives in Checkbox.tsx, switches in Switch.tsx.
import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToggleChip } from '@/components/common/ToggleChip';

export type FieldSize = 'xs' | 'sm' | 'md' | 'lg';

const FIELD_BASE =
  'w-full border border-border-color bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 aria-invalid:border-accent-red aria-invalid:focus:ring-accent-red disabled:cursor-not-allowed disabled:opacity-50';
const FIELD_ERROR = 'border-accent-red focus:ring-accent-red';
// 16px on small screens stops iOS Safari from zooming into focused inputs.
const FIELD_SIZES: Record<FieldSize, string> = {
  // Controls that sit inside a toolbar or a pager, next to icon buttons. Compact on purpose (no 16px iOS rule).
  xs: 'px-1.5 py-1 text-mini sm:px-2 sm:text-xs lg:px-3 lg:py-1.5 lg:text-sm wide:text-base pointer-coarse:min-h-11 pointer-coarse:min-w-11',
  sm: 'px-2.5 py-1.5 text-base sm:text-xs pointer-coarse:min-h-11',
  md: 'px-3 py-2.5 text-base sm:text-sm',
  lg: 'px-4 py-3 text-base',
};

/** The one corner radius of a field. `pill` is the only alternative (search boxes in tight toolbars). */
const FIELD_RADIUS = 'rounded-control';
const FIELD_RADIUS_PILL = 'rounded-full';
/** SearchInput's token-variant frame: the field look, lit while anything inside it has focus. Chips scroll sideways rather than wrap. */
const TOKEN_FIELD_FRAME =
  'flex w-full min-w-0 cursor-text items-center gap-2 border border-border-color bg-bg-elevated text-text-primary transition-colors focus-within:border-accent-red focus-within:ring-1 focus-within:ring-accent-red/50';

interface CommonFieldProps {
  fieldSize?: FieldSize;
  invalid?: boolean;
  pill?: boolean;
}

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & CommonFieldProps;
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { fieldSize = 'md', invalid, pill = false, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], pill ? FIELD_RADIUS_PILL : FIELD_RADIUS, invalid && FIELD_ERROR, className)}
      {...rest}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & CommonFieldProps;
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { fieldSize = 'md', invalid, pill = false, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], pill ? FIELD_RADIUS_PILL : FIELD_RADIUS, 'resize-y', invalid && FIELD_ERROR, className)}
      {...rest}
    />
  );
});

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & CommonFieldProps;
/** Native select for short, simple lists. Use CustomDropdown for rich options. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { fieldSize = 'md', invalid, pill = false, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, FIELD_SIZES[fieldSize], pill ? FIELD_RADIUS_PILL : FIELD_RADIUS, 'cursor-pointer [&>option]:bg-bg-surface [&>option]:text-text-primary', invalid && FIELD_ERROR, className)}
      {...rest}
    >
      {children}
    </select>
  );
});

export interface IconInputProps extends InputProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  /** Class for the wrapper (width / margin / order). */
  wrapperClassName?: string;
}
/** An input with an icon inside its left edge (search, password, e-mail). Anything on its right edge stays the caller's. */
export const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(function IconInput(
  { icon: Icon, wrapperClassName, className, fieldSize = 'md', ...rest },
  ref
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input ref={ref} fieldSize={fieldSize} className={cn('pl-9', className)} {...rest} />
    </div>
  );
});

interface SearchToken {
  key: string;
  label: string;
  /** Accessible name of the token's remove button ("Remove Healing filter"). */
  removeLabel: string;
}

export interface SearchInputProps extends Omit<IconInputProps, 'icon' | 'type'> {
  /**
   * The token variant: active filters shown as removable chips inside the
   * field, before the text, so adding one never changes the layout around it.
   * Backspace in an empty box removes the last chip. Needs `onRemoveToken`.
   */
  tokens?: readonly SearchToken[];
  onRemoveToken?: (key: string) => void;
  /** Token variant: a clear button shown while there is text. */
  onClear?: () => void;
  clearLabel?: string;
  /** Token variant: the frame element (anchor for a suggestions popover). */
  frameRef?: React.Ref<HTMLLabelElement>;
  /** Token variant: static content at the right edge of the frame, ruled off from the text (a result count). */
  trailing?: React.ReactNode;
}

/** The token variant's body. The frame is a <label>, so a click anywhere in it focuses the text. */
const TokenSearchFrame = React.forwardRef<
  HTMLInputElement,
  Omit<SearchInputProps, 'tokens' | 'onRemoveToken'> & { tokens: readonly SearchToken[]; onRemoveToken: (key: string) => void }
>(function TokenSearchFrame(
  { tokens, onRemoveToken, onClear, clearLabel, wrapperClassName, frameRef, trailing, fieldSize = 'md', pill = false, invalid, className, onKeyDown, value, ...rest },
  ref
) {
  const hasText = typeof value === 'string' ? value.length > 0 : Boolean(value);
  return (
    <label
      ref={frameRef}
      className={cn(TOKEN_FIELD_FRAME, FIELD_SIZES[fieldSize], pill ? FIELD_RADIUS_PILL : FIELD_RADIUS, wrapperClassName)}
    >
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {tokens.map((token) => (
          // Slimmer than a standalone chip so the field keeps its height on touch screens too.
          <ToggleChip
            key={token.key}
            size="xs"
            pill
            pressed
            aria-label={token.removeLabel}
            onClick={() => onRemoveToken(token.key)}
            className="px-2 py-0.5 leading-tight pointer-coarse:min-h-0"
          >
            {token.label}
            <X aria-hidden="true" className="h-3 w-3" />
          </ToggleChip>
        ))}
        <input
          ref={ref}
          type="search"
          value={value}
          aria-invalid={invalid || undefined}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !hasText && tokens.length > 0) onRemoveToken(tokens[tokens.length - 1].key);
            onKeyDown?.(e);
          }}
          // The field draws its own clear button, so the browser's built-in one (Chrome, Safari) is hidden.
          className={cn(
            'min-w-16 flex-1 border-0 bg-transparent p-0 text-inherit placeholder:text-text-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none',
            className
          )}
          {...rest}
        />
      </span>
      {hasText && onClear && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary after:absolute after:-inset-3"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      )}
      {trailing && <span className="shrink-0 border-l border-border-color pl-2.5">{trailing}</span>}
    </label>
  );
});

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { tokens, onRemoveToken, onClear, clearLabel, frameRef, trailing, ...props },
  ref
) {
  if (tokens && onRemoveToken) {
    return (
      <TokenSearchFrame
        ref={ref}
        tokens={tokens}
        onRemoveToken={onRemoveToken}
        onClear={onClear}
        clearLabel={clearLabel}
        frameRef={frameRef}
        trailing={trailing}
        {...props}
      />
    );
  }
  return <IconInput ref={ref} icon={Search} type="search" {...props} />;
});

/** The small caps label above a field. Put it on a <label> yourself, or use FormField. */
const FIELD_LABEL = 'block type-label-xs text-text-secondary';
export const FieldLabel: React.FC<React.LabelHTMLAttributes<HTMLElement> & { as?: 'label' | 'span' }> = ({ as: Tag = 'label', className, children, ...rest }) => (
  <Tag className={cn(FIELD_LABEL, 'mb-1', className)} {...rest}>
    {children}
  </Tag>
);

/** Label + control + hint/error row. `required` adds the red asterisk. */
export const FormField: React.FC<{
  label: React.ReactNode;
  htmlFor?: string;
  /** Id of the label itself, for `aria-labelledby` on a control a `<label>` cannot point at. */
  labelId?: string;
  required?: boolean;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, labelId, required = false, icon, hint, error, className, children }) => (
  <div className={className}>
    <FieldLabel id={labelId} htmlFor={htmlFor} className={cn(icon && 'flex items-center gap-1.5')}>
      {icon}
      {label}
      {required && <span className="text-accent-red"> *</span>}
    </FieldLabel>
    {children}
    {error ? (
      <p role="alert" className="mt-1 type-caption font-medium text-accent-red">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1 type-caption text-text-muted">{hint}</p>
    )}
  </div>
);
